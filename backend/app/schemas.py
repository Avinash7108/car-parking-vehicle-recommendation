from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

# Auth Schemas
class UserRegister(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    email: str
    mobile: str = Field(..., min_length=7, max_length=20)
    password: str = Field(..., min_length=6)
    confirm_password: str
    vehicle_registration_number: str = Field(..., min_length=4, max_length=25)
    vehicle_type: str = "Sedan"
    vehicle_model: str = "Generic Car"

class UserLogin(BaseModel):
    email: str
    password: str
    remember_me: bool = False

class ForgotPasswordRequest(BaseModel):
    email: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class UserProfile(BaseModel):
    id: int
    full_name: str
    email: str
    mobile: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

# Active Booking Brief for Slot Cards
class ActiveBookingBrief(BaseModel):
    id: int
    booking_code: str
    customer_name: str
    user_id: int
    vehicle_plate: str
    booking_date: str
    expected_arrival: str
    expected_departure: str
    status: str

    class Config:
        from_attributes = True

# Parking Area & Slot Schemas
class ParkingSlotSchema(BaseModel):
    id: int
    slot_number: str
    area_id: int
    slot_type: str
    status: str
    vehicle_compatibility: str
    distance_from_entrance: int
    current_booking_id: Optional[int] = None
    active_booking: Optional[ActiveBookingBrief] = None

    class Config:
        from_attributes = True

class ParkingAreaSchema(BaseModel):
    id: int
    name: str
    code: str
    description: str
    total_slots: int
    is_active: bool
    slots: List[ParkingSlotSchema] = []

    class Config:
        from_attributes = True

class AreaCreateUpdate(BaseModel):
    name: str
    code: str
    description: str = ""
    total_slots: int = 5

class SlotCreateUpdate(BaseModel):
    slot_number: str
    area_id: int
    slot_type: str = "Standard"
    status: str = "Available"
    vehicle_compatibility: str = "All"
    distance_from_entrance: int = 15

# Booking Schemas
class BookingCreate(BaseModel):
    customer_name: str
    customer_email: str
    customer_mobile: str
    vehicle_plate: str
    vehicle_model: str = ""
    vehicle_type: str = "Sedan"
    parking_area_name: str
    slot_number: str
    booking_date: str         # YYYY-MM-DD
    expected_arrival: str     # HH:MM
    expected_departure: str   # HH:MM

class BookingResponse(BaseModel):
    id: int
    booking_code: str
    customer_name: str
    customer_email: str
    customer_mobile: str
    vehicle_plate: str
    vehicle_model: str
    vehicle_type: str
    parking_area_name: str
    slot_number: str
    booking_date: str
    expected_arrival: str
    expected_departure: str
    actual_arrival: Optional[datetime] = None
    actual_departure: Optional[datetime] = None
    status: str
    qr_code_base64: Optional[str] = None
    is_free: bool = True
    created_at: datetime

    class Config:
        from_attributes = True

# QR & Entry/Exit Schemas
class QRVerifyRequest(BaseModel):
    qr_payload: str
    action: str = "ENTRY"  # "ENTRY" or "EXIT"

class ManualBookingVerifyRequest(BaseModel):
    booking_code: str
    action: str = "ENTRY"

class VehicleDetectRequest(BaseModel):
    image_base64: Optional[str] = None
    camera_mode: str = "upload"  # "upload", "webcam", "demo"
    demo_image_id: Optional[str] = None

# Recommendation Schema
class RecommendationRequest(BaseModel):
    vehicle_type: Optional[str] = "Sedan"
    preferred_area: Optional[str] = None
    distance_priority: Optional[bool] = True

class NotificationSchema(BaseModel):
    id: int
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
