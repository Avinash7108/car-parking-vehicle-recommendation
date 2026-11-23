import io
import base64
import json
import datetime
import qrcode
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Booking, ParkingSlot, EntryExitLog, Notification, User
from ..schemas import QRVerifyRequest, ManualBookingVerifyRequest
from ..auth import get_current_user

router = APIRouter(prefix="/api/qr", tags=["QR Technology & Entrance"])

def generate_booking_qr_base64(booking_code: str, slot_number: str, plate: str, customer_name: str) -> str:
    """Generates a high-resolution QR code embedding booking verification details."""
    payload = json.dumps({
        "app": "SMART_PARK_AI",
        "code": booking_code,
        "slot": slot_number,
        "plate": plate,
        "name": customer_name,
        "gen_at": datetime.datetime.utcnow().isoformat()
    })

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8,
        border=3,
    )
    qr.add_data(payload)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0B132B", back_color="#FFFFFF")

    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    b64_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64_str}"

@router.post("/verify")
def verify_qr_entry_or_exit(request: QRVerifyRequest, db: Session = Depends(get_db)):
    """
    Verifies a scanned QR code at the parking gate.
    Handles ENTRY and EXIT workflows, updates slot occupancy, and logs entry/exit.
    """
    raw_payload = request.qr_payload.strip()
    booking_code = raw_payload

    # Parse if JSON
    try:
        if "{" in raw_payload and "}" in raw_payload:
            parsed = json.loads(raw_payload)
            booking_code = parsed.get("code", raw_payload)
    except Exception:
        pass

    booking = db.query(Booking).filter(Booking.booking_code == booking_code).first()
    if not booking:
        # Check if code without prefix or partial
        booking = db.query(Booking).filter(Booking.booking_code.ilike(f"%{booking_code}%")).first()

    if not booking:
        # Log denied attempt
        log = EntryExitLog(
            slot_number="UNKNOWN",
            vehicle_plate="UNKNOWN",
            action_type="DENIED",
            verification_method="QR_SCAN",
            notes=f"Invalid QR payload: {raw_payload[:50]}"
        )
        db.add(log)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="BOOKING NOT FOUND: The scanned QR code does not correspond to any registered reservation."
        )

    action = request.action.upper()

    if action == "ENTRY":
        if booking.status in ["Parked", "Arrived"]:
            return {
                "success": True,
                "status": "ALREADY_INSIDE",
                "message": f"Vehicle {booking.vehicle_plate} is already recorded as inside at Bay {booking.slot_number}.",
                "booking": {
                    "code": booking.booking_code,
                    "customer_name": booking.customer_name,
                    "slot_number": booking.slot_number,
                    "area": booking.parking_area_name,
                    "status": booking.status
                }
            }
        elif booking.status in ["Completed", "Cancelled", "Expired"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"BOOKING {booking.status.upper()}: This reservation is no longer active and cannot be used for entry."
            )

        # Approve entry!
        booking.status = "Parked"
        booking.actual_arrival = datetime.datetime.utcnow()

        # Update slot to Occupied
        slot = db.query(ParkingSlot).filter(ParkingSlot.slot_number == booking.slot_number).first()
        if slot:
            slot.status = "Occupied"
            slot.current_booking_id = booking.id

        # Log entrance
        log = EntryExitLog(
            booking_id=booking.id,
            slot_number=booking.slot_number,
            vehicle_plate=booking.vehicle_plate,
            action_type="ENTRY",
            verification_method="QR_SCAN",
            notes=f"Valid QR entry approved for {booking.customer_name}."
        )
        db.add(log)

        # Notify user
        notif = Notification(
            user_id=booking.user_id,
            title="Vehicle Entry Approved",
            message=f"Welcome! Your vehicle {booking.vehicle_plate} has entered. Assigned slot: {booking.slot_number} ({booking.parking_area_name}).",
            type="success"
        )
        db.add(notif)
        db.commit()

        return {
            "success": True,
            "status": "ENTRY_APPROVED",
            "message": f"Entry Approved! Welcome, {booking.customer_name}. Please proceed to slot {booking.slot_number}.",
            "booking": {
                "code": booking.booking_code,
                "customer_name": booking.customer_name,
                "customer_mobile": booking.customer_mobile,
                "vehicle_plate": booking.vehicle_plate,
                "vehicle_model": booking.vehicle_model,
                "slot_number": booking.slot_number,
                "area": booking.parking_area_name,
                "arrival_time": datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
                "status": "Parked"
            }
        }

    elif action == "EXIT":
        if booking.status not in ["Parked", "Arrived", "Confirmed"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot exit: Booking is currently in '{booking.status}' status."
            )

        booking.status = "Completed"
        booking.actual_departure = datetime.datetime.utcnow()

        # Release slot
        slot = db.query(ParkingSlot).filter(ParkingSlot.slot_number == booking.slot_number).first()
        if slot:
            slot.status = "Available"
            slot.current_booking_id = None

        # Log exit
        log = EntryExitLog(
            booking_id=booking.id,
            slot_number=booking.slot_number,
            vehicle_plate=booking.vehicle_plate,
            action_type="EXIT",
            verification_method="QR_SCAN",
            notes=f"Vehicle exited successfully. Slot {booking.slot_number} released."
        )
        db.add(log)

        # Notify user
        notif = Notification(
            user_id=booking.user_id,
            title="Parking Session Completed",
            message=f"Thank you for visiting SMART PARK AI! Your session for slot {booking.slot_number} is completed. Drive safely!",
            type="info"
        )
        db.add(notif)
        db.commit()

        return {
            "success": True,
            "status": "EXIT_APPROVED",
            "message": f"Exit Approved! Slot {booking.slot_number} has been released and is now Available.",
            "booking": {
                "code": booking.booking_code,
                "customer_name": booking.customer_name,
                "vehicle_plate": booking.vehicle_plate,
                "slot_number": booking.slot_number,
                "departure_time": datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
                "status": "Completed"
            }
        }

    raise HTTPException(status_code=400, detail="Invalid action parameter. Must be ENTRY or EXIT.")

@router.post("/manual-verify")
def manual_code_verify(request: ManualBookingVerifyRequest, db: Session = Depends(get_db)):
    """Fallback endpoint for manual booking code entry at the gate."""
    qr_req = QRVerifyRequest(qr_payload=request.booking_code, action=request.action)
    return verify_qr_entry_or_exit(qr_req, db)
