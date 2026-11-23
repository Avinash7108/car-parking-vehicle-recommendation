import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text, UniqueConstraint
)
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(120), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    mobile = Column(String(30), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="customer")  # "customer" or "admin"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    vehicles = relationship("Vehicle", back_populates="owner", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    plate_number = Column(String(30), index=True, nullable=False)
    vehicle_type = Column(String(30), default="Sedan")  # Sedan, SUV, Hatchback, EV, Motorcycle
    vehicle_model = Column(String(60), default="")
    is_default = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="vehicles")
    bookings = relationship("Booking", back_populates="vehicle")

class ParkingArea(Base):
    __tablename__ = "parking_areas"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(10), unique=True, nullable=False)  # "A", "B", "C"
    description = Column(String(255), default="")
    total_slots = Column(Integer, default=5)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    slots = relationship("ParkingSlot", back_populates="area", cascade="all, delete-orphan")

class ParkingSlot(Base):
    __tablename__ = "parking_slots"

    id = Column(Integer, primary_key=True, index=True)
    slot_number = Column(String(20), unique=True, index=True, nullable=False)  # "A-01", "B-03"
    area_id = Column(Integer, ForeignKey("parking_areas.id"), nullable=False)
    slot_type = Column(String(30), default="Standard")  # Standard, Compact, EV Charging, Handicap
    status = Column(String(20), default="Available")  # Available, Occupied, Reserved, Disabled
    vehicle_compatibility = Column(String(50), default="All")  # All, Sedan, SUV, EV, Motorcycle
    distance_from_entrance = Column(Integer, default=15)  # in meters
    current_booking_id = Column(Integer, nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    area = relationship("ParkingArea", back_populates="slots")
    bookings = relationship("Booking", back_populates="slot")

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    booking_code = Column(String(50), unique=True, index=True, nullable=False)  # "SP-20261122-XXXX"
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    slot_id = Column(Integer, ForeignKey("parking_slots.id"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True)

    customer_name = Column(String(120), nullable=False)
    customer_email = Column(String(120), nullable=False)
    customer_mobile = Column(String(30), nullable=False)
    vehicle_plate = Column(String(30), index=True, nullable=False)
    vehicle_model = Column(String(60), default="")
    vehicle_type = Column(String(30), default="Car")

    parking_area_name = Column(String(100), default="")
    slot_number = Column(String(20), nullable=False)

    booking_date = Column(String(20), nullable=False)       # YYYY-MM-DD
    expected_arrival = Column(String(10), nullable=False)    # HH:MM
    expected_departure = Column(String(10), nullable=False)  # HH:MM

    actual_arrival = Column(DateTime, nullable=True)
    actual_departure = Column(DateTime, nullable=True)

    status = Column(String(30), default="Confirmed")  # Confirmed, Arrived, Parked, Completed, Cancelled, Expired
    qr_code_base64 = Column(Text, nullable=True)
    qr_payload = Column(String(255), nullable=True)

    is_free = Column(Boolean, default=True)  # Completely FREE
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="bookings")
    slot = relationship("ParkingSlot", back_populates="bookings")
    vehicle = relationship("Vehicle", back_populates="bookings")
    entry_exit_logs = relationship("EntryExitLog", back_populates="booking")

class EntryExitLog(Base):
    __tablename__ = "entry_exit_logs"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=True)
    slot_number = Column(String(20), nullable=True)
    vehicle_plate = Column(String(30), nullable=False)
    action_type = Column(String(20), nullable=False)  # "ENTRY", "EXIT", "DENIED"
    verification_method = Column(String(30), default="QR_SCAN")  # "QR_SCAN", "LICENSE_PLATE_AI", "MANUAL"
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    notes = Column(String(255), default="")

    booking = relationship("Booking", back_populates="entry_exit_logs")

class VehicleDetectionLog(Base):
    __tablename__ = "vehicle_detection_logs"

    id = Column(Integer, primary_key=True, index=True)
    image_name = Column(String(255), default="")
    detected_classes = Column(String(255), default="Car")  # "Car (94%), SUV (89%)"
    vehicle_count = Column(Integer, default=1)
    detected_plate = Column(String(40), nullable=True)
    confidence = Column(Float, default=0.0)
    matched_booking_id = Column(Integer, nullable=True)
    verification_status = Column(String(30), default="UNVERIFIED")  # "MATCHED", "UNREGISTERED", "MANUAL_CHECK"
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(20), default="info")  # "info", "success", "warning", "danger"
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="notifications")
