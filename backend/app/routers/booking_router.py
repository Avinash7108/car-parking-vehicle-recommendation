import random
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Booking, ParkingSlot, ParkingArea, Notification, User, Vehicle
from ..schemas import BookingCreate, BookingResponse
from ..auth import get_current_user
from .qr_router import generate_booking_qr_base64

router = APIRouter(prefix="/api/bookings", tags=["Free Booking Workflow"])

def generate_unique_booking_code(db: Session) -> str:
    today_str = datetime.datetime.utcnow().strftime("%Y%m%d")
    for _ in range(50):
        rand_num = random.randint(1000, 9999)
        code = f"SP-{today_str}-{rand_num}"
        existing = db.query(Booking).filter(Booking.booking_code == code).first()
        if not existing:
            return code
    return f"SP-{today_str}-{random.randint(10000, 99999)}"

def _do_create_booking(data: BookingCreate, db: Session, current_user: User):
    """Core booking logic shared by all create endpoints."""
    slot = db.query(ParkingSlot).filter(ParkingSlot.slot_number == data.slot_number).first()
    if not slot:
        raise HTTPException(status_code=404, detail=f"Parking slot '{data.slot_number}' not found.")
    if slot.status == "Disabled":
        raise HTTPException(status_code=400, detail=f"Slot '{data.slot_number}' is disabled for maintenance.")

    overlapping_booking = db.query(Booking).filter(
        Booking.slot_number == data.slot_number,
        Booking.booking_date == data.booking_date,
        Booking.status.in_(["Confirmed", "Arrived", "Parked"]),
        Booking.expected_arrival < data.expected_departure,
        Booking.expected_departure > data.expected_arrival
    ).first()

    if overlapping_booking:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"DOUBLE BOOKING PREVENTED: Slot {data.slot_number} is already booked on {data.booking_date} "
                   f"between {overlapping_booking.expected_arrival} and {overlapping_booking.expected_departure}. "
                   f"Please select a different slot or time window."
        )

    booking_code = generate_unique_booking_code(db)
    qr_base64 = generate_booking_qr_base64(
        booking_code=booking_code,
        slot_number=slot.slot_number,
        plate=data.vehicle_plate,
        customer_name=data.customer_name
    )

    vehicle = db.query(Vehicle).filter(
        Vehicle.user_id == current_user.id,
        Vehicle.plate_number == data.vehicle_plate
    ).first()
    if not vehicle:
        vehicle = Vehicle(
            user_id=current_user.id,
            plate_number=data.vehicle_plate,
            vehicle_type=data.vehicle_type,
            vehicle_model=data.vehicle_model,
            is_default=False
        )
        db.add(vehicle)
        db.flush()

    area_name = data.parking_area_name
    if not area_name and hasattr(slot, 'area') and slot.area:
        area_name = slot.area.name

    new_booking = Booking(
        booking_code=booking_code,
        user_id=current_user.id,
        slot_id=slot.id,
        vehicle_id=vehicle.id if vehicle else None,
        customer_name=data.customer_name,
        customer_email=data.customer_email,
        customer_mobile=data.customer_mobile,
        vehicle_plate=data.vehicle_plate,
        vehicle_model=data.vehicle_model,
        vehicle_type=data.vehicle_type,
        parking_area_name=area_name,
        slot_number=slot.slot_number,
        booking_date=data.booking_date,
        expected_arrival=data.expected_arrival,
        expected_departure=data.expected_departure,
        status="Confirmed",
        qr_code_base64=qr_base64,
        qr_payload=booking_code,
        is_free=True
    )
    db.add(new_booking)
    db.flush()

    slot.status = "Reserved"
    slot.current_booking_id = new_booking.id

    notification = Notification(
        user_id=current_user.id,
        title="Free Booking Confirmed",
        message=f"Success! Bay {slot.slot_number} reserved for {data.booking_date} ({data.expected_arrival} - {data.expected_departure}). Booking ID: {booking_code}.",
        type="success"
    )
    db.add(notification)
    db.commit()
    db.refresh(new_booking)
    return new_booking

# --- CREATE BOOKING: Multiple route aliases for compatibility ---
@router.post("", response_model=BookingResponse)
def create_free_booking(data: BookingCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Creates a 100% FREE parking reservation (POST /api/bookings)."""
    return _do_create_booking(data, db, current_user)

@router.post("/create", response_model=BookingResponse)
def create_free_booking_alias(data: BookingCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Creates a 100% FREE parking reservation (POST /api/bookings/create)."""
    return _do_create_booking(data, db, current_user)

# --- GET MY BOOKINGS: Multiple route aliases ---
@router.get("/my", response_model=List[BookingResponse])
def get_my_bookings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Retrieves all reservations belonging to the authenticated customer."""
    return db.query(Booking).filter(Booking.user_id == current_user.id).order_by(Booking.created_at.desc()).all()

@router.get("/my-bookings", response_model=List[BookingResponse])
def get_my_bookings_alias(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Alias: GET /api/bookings/my-bookings"""
    return db.query(Booking).filter(Booking.user_id == current_user.id).order_by(Booking.created_at.desc()).all()

@router.get("/active-summary")
def get_my_active_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Returns active booking summary for customer dashboard."""
    all_user_bookings = db.query(Booking).filter(Booking.user_id == current_user.id).all()
    total = len(all_user_bookings)
    active = None
    upcoming = []
    history = []

    for b in all_user_bookings:
        if b.status in ["Confirmed", "Arrived", "Parked"]:
            if not active:
                active = b
            else:
                upcoming.append(b)
        else:
            history.append(b)

    history.sort(key=lambda x: x.created_at, reverse=True)

    return {
        "customer_name": current_user.full_name,
        "total_bookings": total,
        "active_booking": active,
        "upcoming_reservations_count": len(upcoming),
        "upcoming_reservations": upcoming[:3],
        "recent_history": history[:5]
    }

@router.get("/{booking_id}", response_model=BookingResponse)
def get_booking_by_id(booking_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if current_user.role != "admin" and booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized access to this booking")
    return booking

@router.post("/{booking_id}/cancel")
def cancel_booking(booking_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Cancels an active booking and releases the reserved slot."""
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if current_user.role != "admin" and booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized to cancel this booking")
    if booking.status in ["Completed", "Cancelled"]:
        raise HTTPException(status_code=400, detail=f"Booking is already {booking.status}.")

    booking.status = "Cancelled"
    slot = db.query(ParkingSlot).filter(ParkingSlot.slot_number == booking.slot_number).first()
    if slot and slot.current_booking_id == booking.id:
        slot.status = "Available"
        slot.current_booking_id = None

    notif = Notification(
        user_id=booking.user_id,
        title="Booking Cancelled",
        message=f"Your booking {booking.booking_code} for Bay {booking.slot_number} has been cancelled. Slot is now released.",
        type="warning"
    )
    db.add(notif)
    db.commit()

    return {
        "success": True,
        "message": f"Booking {booking.booking_code} successfully cancelled. Slot {booking.slot_number} is now Available.",
        "booking_id": booking.id,
        "status": "Cancelled"
    }
