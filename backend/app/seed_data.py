import datetime
from sqlalchemy.orm import Session
from .database import Base, engine, SessionLocal
from .models import (
    User, Vehicle, ParkingArea, ParkingSlot, Booking,
    EntryExitLog, VehicleDetectionLog, Notification
)
from .auth import get_password_hash
from .routers.qr_router import generate_booking_qr_base64

def seed_database():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # Check if already seeded
        if db.query(User).filter(User.email == "admin@smartpark.ai").first():
            print("[SMART PARK AI] Database already contains seed records.")
            return

        print("[SMART PARK AI] Seeding initial database with sample college project data...")

        # 1. Users
        admin_pwd = get_password_hash("Admin@123")
        customer_pwd = get_password_hash("Customer@123")

        admin_user = User(
            full_name="System Administrator",
            email="admin@smartpark.ai",
            mobile="+91 99999 00000",
            hashed_password=admin_pwd,
            role="admin",
            is_active=True
        )

        customer_1 = User(
            full_name="Avinash Sharma",
            email="customer@smartpark.ai",
            mobile="+91 98765 43210",
            hashed_password=customer_pwd,
            role="customer",
            is_active=True
        )

        customer_2 = User(
            full_name="Priya Patel",
            email="priya@smartpark.ai",
            mobile="+91 98220 11223",
            hashed_password=customer_pwd,
            role="customer",
            is_active=True
        )

        db.add_all([admin_user, customer_1, customer_2])
        db.flush()

        # 2. Vehicles
        v1 = Vehicle(
            user_id=customer_1.id,
            plate_number="MH 12 AB 1234",
            vehicle_type="EV",
            vehicle_model="Tata Nexon EV Max",
            is_default=True
        )
        v2 = Vehicle(
            user_id=customer_2.id,
            plate_number="DL 01 CA 5678",
            vehicle_type="SUV",
            vehicle_model="Hyundai Creta SX",
            is_default=True
        )
        v3 = Vehicle(
            user_id=customer_1.id,
            plate_number="KA 05 MN 9999",
            vehicle_type="Sedan",
            vehicle_model="Honda City Hybrid",
            is_default=False
        )
        db.add_all([v1, v2, v3])
        db.flush()

        # 3. Parking Areas
        area_a = ParkingArea(
            name="Area A (North Ground Wing)",
            code="A",
            description="Prime ground floor bays adjacent to main terminal atrium and escalator.",
            total_slots=5
        )
        area_b = ParkingArea(
            name="Area B (East Premium Wing)",
            code="B",
            description="Wide-aisle parking section with shaded bays and quick highway access.",
            total_slots=5
        )
        area_c = ParkingArea(
            name="Area C (South EV & Standard Wing)",
            code="C",
            description="Dedicated green mobility zone with high-capacity Level 2 EV charging docks.",
            total_slots=5
        )
        db.add_all([area_a, area_b, area_c])
        db.flush()

        # 4. Parking Slots (15 slots total: 5 in each area)
        slots_data = [
            # Area A
            ("A-01", area_a.id, "Standard", "Available", "All", 10),
            ("A-02", area_a.id, "Compact", "Available", "Sedan", 14),
            ("A-03", area_a.id, "EV Charging", "Available", "EV", 15),
            ("A-04", area_a.id, "Standard", "Occupied", "All", 20),
            ("A-05", area_a.id, "Handicap Accessible", "Available", "All", 8),
            # Area B
            ("B-01", area_b.id, "Standard", "Available", "All", 25),
            ("B-02", area_b.id, "EV Charging", "Occupied", "EV", 28),
            ("B-03", area_b.id, "Standard", "Reserved", "SUV", 30),
            ("B-04", area_b.id, "Compact", "Available", "Hatchback", 35),
            ("B-05", area_b.id, "Standard", "Available", "All", 38),
            # Area C
            ("C-01", area_c.id, "EV Charging", "Available", "EV", 40),
            ("C-02", area_c.id, "Standard", "Available", "All", 42),
            ("C-03", area_c.id, "Compact", "Disabled", "All", 45),  # Disabled for maintenance
            ("C-04", area_c.id, "Standard", "Available", "All", 48),
            ("C-05", area_c.id, "EV Charging", "Available", "EV", 50),
        ]

        slot_objs = {}
        for num, aid, stype, status, compat, dist in slots_data:
            ps = ParkingSlot(
                slot_number=num,
                area_id=aid,
                slot_type=stype,
                status=status,
                vehicle_compatibility=compat,
                distance_from_entrance=dist
            )
            db.add(ps)
            slot_objs[num] = ps
        db.flush()

        # 5. Bookings
        today = datetime.datetime.utcnow().strftime("%Y-%m-%d")

        # Active Reservation 1 (for Priya in B-03)
        code_b1 = "SP-20261122-8192"
        qr_b1 = generate_booking_qr_base64(code_b1, "B-03", "DL 01 CA 5678", "Priya Patel")
        booking_1 = Booking(
            booking_code=code_b1,
            user_id=customer_2.id,
            slot_id=slot_objs["B-03"].id,
            vehicle_id=v2.id,
            customer_name="Priya Patel",
            customer_email="priya@smartpark.ai",
            customer_mobile="+91 98220 11223",
            vehicle_plate="DL 01 CA 5678",
            vehicle_model="Hyundai Creta SX",
            vehicle_type="SUV",
            parking_area_name=area_b.name,
            slot_number="B-03",
            booking_date=today,
            expected_arrival="14:00",
            expected_departure="18:00",
            status="Confirmed",
            qr_code_base64=qr_b1,
            qr_payload=code_b1,
            is_free=True
        )
        db.add(booking_1)
        db.flush()
        slot_objs["B-03"].current_booking_id = booking_1.id

        # Occupied Vehicle in A-04 (Parked by customer_1)
        code_b2 = "SP-20261122-4419"
        qr_b2 = generate_booking_qr_base64(code_b2, "A-04", "MH 12 AB 1234", "Avinash Sharma")
        booking_2 = Booking(
            booking_code=code_b2,
            user_id=customer_1.id,
            slot_id=slot_objs["A-04"].id,
            vehicle_id=v1.id,
            customer_name="Avinash Sharma",
            customer_email="customer@smartpark.ai",
            customer_mobile="+91 98765 43210",
            vehicle_plate="MH 12 AB 1234",
            vehicle_model="Tata Nexon EV Max",
            vehicle_type="EV",
            parking_area_name=area_a.name,
            slot_number="A-04",
            booking_date=today,
            expected_arrival="09:00",
            expected_departure="17:00",
            actual_arrival=datetime.datetime.utcnow() - datetime.timedelta(hours=2),
            status="Parked",
            qr_code_base64=qr_b2,
            qr_payload=code_b2,
            is_free=True
        )
        db.add(booking_2)
        db.flush()
        slot_objs["A-04"].current_booking_id = booking_2.id

        # Past Completed Booking for Avinash Sharma
        yesterday = (datetime.datetime.utcnow() - datetime.timedelta(days=1)).strftime("%Y-%m-%d")
        code_b3 = "SP-20261121-1102"
        qr_b3 = generate_booking_qr_base64(code_b3, "A-01", "MH 12 AB 1234", "Avinash Sharma")
        booking_3 = Booking(
            booking_code=code_b3,
            user_id=customer_1.id,
            slot_id=slot_objs["A-01"].id,
            vehicle_id=v1.id,
            customer_name="Avinash Sharma",
            customer_email="customer@smartpark.ai",
            customer_mobile="+91 98765 43210",
            vehicle_plate="MH 12 AB 1234",
            vehicle_model="Tata Nexon EV Max",
            vehicle_type="EV",
            parking_area_name=area_a.name,
            slot_number="A-01",
            booking_date=yesterday,
            expected_arrival="10:00",
            expected_departure="13:00",
            actual_arrival=datetime.datetime.utcnow() - datetime.timedelta(days=1, hours=4),
            actual_departure=datetime.datetime.utcnow() - datetime.timedelta(days=1, hours=1),
            status="Completed",
            qr_code_base64=qr_b3,
            qr_payload=code_b3,
            is_free=True
        )
        db.add(booking_3)

        # 6. Entry Exit Logs
        log1 = EntryExitLog(
            booking_id=booking_2.id,
            slot_number="A-04",
            vehicle_plate="MH 12 AB 1234",
            action_type="ENTRY",
            verification_method="QR_SCAN",
            timestamp=datetime.datetime.utcnow() - datetime.timedelta(hours=2),
            notes="Gate 1 scanner approved valid reservation QR code."
        )
        log2 = EntryExitLog(
            booking_id=booking_3.id,
            slot_number="A-01",
            vehicle_plate="MH 12 AB 1234",
            action_type="EXIT",
            verification_method="LICENSE_PLATE_AI",
            timestamp=datetime.datetime.utcnow() - datetime.timedelta(days=1, hours=1),
            notes="Computer vision recognized MH 12 AB 1234. Exit boom barrier opened."
        )
        db.add_all([log1, log2])

        # 7. Vehicle Detection Logs
        vlog1 = VehicleDetectionLog(
            image_name="camera_feed_gate1.jpg",
            detected_classes="EV (98%), Sedan (88%)",
            vehicle_count=1,
            detected_plate="MH 12 AB 1234",
            confidence=0.98,
            matched_booking_id=booking_2.id,
            verification_status="MATCHED",
            timestamp=datetime.datetime.utcnow() - datetime.timedelta(hours=2)
        )
        vlog2 = VehicleDetectionLog(
            image_name="camera_feed_gate2.jpg",
            detected_classes="SUV (94%)",
            vehicle_count=1,
            detected_plate="DL 01 CA 5678",
            confidence=0.94,
            matched_booking_id=booking_1.id,
            verification_status="MATCHED",
            timestamp=datetime.datetime.utcnow() - datetime.timedelta(minutes=45)
        )
        db.add_all([vlog1, vlog2])

        # 8. Notifications
        n1 = Notification(
            user_id=customer_1.id,
            title="Vehicle Checked In Successfully",
            message="Your vehicle MH 12 AB 1234 was scanned at Gate 1 and is parked at Bay A-04.",
            type="success",
            is_read=False
        )
        n2 = Notification(
            user_id=customer_1.id,
            title="AI Parking Recommendations Ready",
            message="Based on your Tata Nexon EV, we have mapped optimal EV Charging bays with walking distances under 20s.",
            type="info",
            is_read=True
        )
        db.add_all([n1, n2])

        db.commit()
        print("[SMART PARK AI] Seed data populated successfully!")

    except Exception as e:
        db.rollback()
        print(f"[SMART PARK AI] Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
