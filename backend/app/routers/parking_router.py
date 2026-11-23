from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import ParkingArea, ParkingSlot, Booking, User
from ..schemas import ParkingAreaSchema, ParkingSlotSchema, AreaCreateUpdate, SlotCreateUpdate, ActiveBookingBrief
from ..auth import get_current_user, get_current_admin

router = APIRouter(prefix="/api/parking", tags=["Parking Management & Layout"])

@router.get("/occupancy")
def get_live_occupancy(db: Session = Depends(get_db)):
    """Computes real-time parking occupancy metrics across all active facilities."""
    total_slots = db.query(ParkingSlot).count()
    available = db.query(ParkingSlot).filter(ParkingSlot.status == "Available").count()
    occupied = db.query(ParkingSlot).filter(ParkingSlot.status == "Occupied").count()
    reserved = db.query(ParkingSlot).filter(ParkingSlot.status == "Reserved").count()
    disabled = db.query(ParkingSlot).filter(ParkingSlot.status == "Disabled").count()

    active_in_use = occupied + reserved
    occupancy_pct = round((active_in_use / total_slots * 100), 1) if total_slots > 0 else 0.0

    # Per-area breakdown
    areas = db.query(ParkingArea).filter(ParkingArea.is_active == True).all()
    area_stats = []
    for a in areas:
        a_total = len(a.slots)
        a_avail = sum(1 for s in a.slots if s.status == "Available")
        a_occ = sum(1 for s in a.slots if s.status == "Occupied")
        a_res = sum(1 for s in a.slots if s.status == "Reserved")
        a_dis = sum(1 for s in a.slots if s.status == "Disabled")
        a_pct = round(((a_occ + a_res) / a_total * 100), 1) if a_total > 0 else 0.0

        area_stats.append({
            "id": a.id,
            "name": a.name,
            "code": a.code,
            "description": a.description,
            "total_slots": a_total,
            "available": a_avail,
            "occupied": a_occ,
            "reserved": a_res,
            "disabled": a_dis,
            "occupancy_rate": a_pct
        })

    return {
        "total_slots": total_slots,
        "available_slots": available,
        "occupied_slots": occupied,
        "reserved_slots": reserved,
        "disabled_slots": disabled,
        "occupancy_percentage": occupancy_pct,
        "areas": area_stats
    }

@router.get("/areas", response_model=List[ParkingAreaSchema])
def list_parking_areas(db: Session = Depends(get_db)):
    """
    Lists all active parking areas with nested slot lists,
    attaching active booking information to booked/reserved slots.
    """
    areas = db.query(ParkingArea).filter(ParkingArea.is_active == True).all()

    # Pre-fetch all active bookings to attach to booked slots
    active_bookings = db.query(Booking).filter(
        Booking.status.in_(["Confirmed", "Arrived", "Parked"])
    ).all()
    booking_by_slot = {b.slot_number: b for b in active_bookings}

    for a in areas:
        for s in a.slots:
            s.active_booking = booking_by_slot.get(s.slot_number)

    return areas

@router.get("/slots", response_model=List[ParkingSlotSchema])
def list_parking_slots(
    area_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Returns parking slots with active booking details attached."""
    query = db.query(ParkingSlot)
    if area_id:
        query = query.filter(ParkingSlot.area_id == area_id)
    if status_filter:
        query = query.filter(ParkingSlot.status == status_filter)

    slots = query.order_by(ParkingSlot.slot_number).all()

    active_bookings = db.query(Booking).filter(
        Booking.status.in_(["Confirmed", "Arrived", "Parked"])
    ).all()
    booking_by_slot = {b.slot_number: b for b in active_bookings}

    for s in slots:
        s.active_booking = booking_by_slot.get(s.slot_number)

    return slots

@router.get("/slots/{slot_id}", response_model=ParkingSlotSchema)
def get_slot_details(slot_id: int, db: Session = Depends(get_db)):
    slot = db.query(ParkingSlot).filter(ParkingSlot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Parking slot not found")

    active_booking = db.query(Booking).filter(
        Booking.slot_number == slot.slot_number,
        Booking.status.in_(["Confirmed", "Arrived", "Parked"])
    ).first()
    slot.active_booking = active_booking
    return slot

# QUICK ADD PARKING AREA FEATURE (Easy area addition)
@router.post("/quick-add-area")
def quick_add_parking_area(data: AreaCreateUpdate, db: Session = Depends(get_db)):
    """
    Easily creates a new parking area and auto-generates its parking slots.
    """
    code_clean = data.code.upper().strip()
    existing = db.query(ParkingArea).filter(
        (ParkingArea.name == data.name) | (ParkingArea.code == code_clean)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Parking area with name '{data.name}' or code '{code_clean}' already exists.")

    new_area = ParkingArea(
        name=data.name.strip(),
        code=code_clean,
        description=data.description.strip() or f"Dedicated parking zone for Wing {code_clean}.",
        total_slots=max(1, min(10, data.total_slots))
    )
    db.add(new_area)
    db.flush()

    # Automatically generate slots for this area
    slot_types = ["Standard", "Compact", "EV Charging", "Standard", "Handicap Accessible"]
    for i in range(1, new_area.total_slots + 1):
        s_num = f"{code_clean}-{i:02d}"
        s_type = slot_types[(i - 1) % len(slot_types)]
        dist = 15 + (i * 5)
        new_slot = ParkingSlot(
            slot_number=s_num,
            area_id=new_area.id,
            slot_type=s_type,
            status="Available",
            vehicle_compatibility="EV" if "EV" in s_type else "All",
            distance_from_entrance=dist
        )
        db.add(new_slot)

    db.commit()
    db.refresh(new_area)
    return {
        "success": True,
        "message": f"Successfully created Parking Area '{new_area.name}' with {new_area.total_slots} ready-to-book slots!",
        "area": {
            "id": new_area.id,
            "name": new_area.name,
            "code": new_area.code,
            "total_slots": new_area.total_slots
        }
    }

# ADMIN CRUD ENDPOINTS
@router.post("/admin/areas", response_model=ParkingAreaSchema)
def create_parking_area(
    data: AreaCreateUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    existing = db.query(ParkingArea).filter(ParkingArea.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="An area with this name already exists.")

    new_area = ParkingArea(
        name=data.name,
        code=data.code.upper(),
        description=data.description,
        total_slots=data.total_slots
    )
    db.add(new_area)
    db.commit()
    db.refresh(new_area)
    return new_area

@router.put("/admin/areas/{area_id}", response_model=ParkingAreaSchema)
def update_parking_area(
    area_id: int,
    data: AreaCreateUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    area = db.query(ParkingArea).filter(ParkingArea.id == area_id).first()
    if not area:
        raise HTTPException(status_code=404, detail="Area not found")
    area.name = data.name
    area.code = data.code.upper()
    area.description = data.description
    area.total_slots = data.total_slots
    db.commit()
    db.refresh(area)
    return area

@router.delete("/admin/areas/{area_id}")
def delete_parking_area(
    area_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    area = db.query(ParkingArea).filter(ParkingArea.id == area_id).first()
    if not area:
        raise HTTPException(status_code=404, detail="Area not found")
    db.delete(area)
    db.commit()
    return {"message": f"Parking Area '{area.name}' and all associated slots deleted successfully."}

@router.post("/admin/slots", response_model=ParkingSlotSchema)
def create_parking_slot(
    data: SlotCreateUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    existing = db.query(ParkingSlot).filter(ParkingSlot.slot_number == data.slot_number.upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Slot number already exists")

    new_slot = ParkingSlot(
        slot_number=data.slot_number.upper(),
        area_id=data.area_id,
        slot_type=data.slot_type,
        status=data.status,
        vehicle_compatibility=data.vehicle_compatibility,
        distance_from_entrance=data.distance_from_entrance
    )
    db.add(new_slot)
    db.commit()
    db.refresh(new_slot)
    return new_slot

@router.put("/admin/slots/{slot_id}", response_model=ParkingSlotSchema)
def update_parking_slot(
    slot_id: int,
    data: SlotCreateUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    slot = db.query(ParkingSlot).filter(ParkingSlot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")

    slot.slot_number = data.slot_number.upper()
    slot.area_id = data.area_id
    slot.slot_type = data.slot_type
    slot.status = data.status
    slot.vehicle_compatibility = data.vehicle_compatibility
    slot.distance_from_entrance = data.distance_from_entrance
    db.commit()
    db.refresh(slot)
    return slot

@router.patch("/admin/slots/{slot_id}/status")
def update_slot_status(
    slot_id: int,
    new_status: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    valid_statuses = ["Available", "Occupied", "Reserved", "Disabled"]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Choose from: {valid_statuses}")

    slot = db.query(ParkingSlot).filter(ParkingSlot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")

    slot.status = new_status
    if new_status == "Available":
        slot.current_booking_id = None
    db.commit()
    return {"message": f"Slot {slot.slot_number} status updated to {new_status}"}

@router.delete("/admin/slots/{slot_id}")
def delete_parking_slot(
    slot_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    slot = db.query(ParkingSlot).filter(ParkingSlot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    num = slot.slot_number
    db.delete(slot)
    db.commit()
    return {"message": f"Slot {num} deleted successfully."}
