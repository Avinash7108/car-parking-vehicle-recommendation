from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Vehicle, Notification
from ..schemas import UserRegister, UserLogin, TokenResponse, ForgotPasswordRequest, UserProfile
from ..auth import verify_password, get_password_hash, create_access_token, get_current_user
from ..config import ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter(prefix="/api/auth", tags=["Authentication & User Management"])

@router.post("/register", response_model=TokenResponse)
def register_user(data: UserRegister, db: Session = Depends(get_db)):
    """Registers a new customer, hashes the password, and creates their initial vehicle profile."""
    if data.password != data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password and confirmation password do not match."
        )

    existing_user = db.query(User).filter(User.email == data.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please log in."
        )

    # Hash password securely
    hashed_pwd = get_password_hash(data.password)

    new_user = User(
        full_name=data.full_name.strip(),
        email=data.email.lower().strip(),
        mobile=data.mobile.strip(),
        hashed_password=hashed_pwd,
        role="customer"
    )
    db.add(new_user)
    db.flush()

    # Create associated default vehicle
    new_vehicle = Vehicle(
        user_id=new_user.id,
        plate_number=data.vehicle_registration_number.upper().strip(),
        vehicle_type=data.vehicle_type,
        vehicle_model=data.vehicle_model.strip(),
        is_default=True
    )
    db.add(new_vehicle)

    # Welcome notification
    welcome_notif = Notification(
        user_id=new_user.id,
        title="Welcome to SMART PARK AI!",
        message=f"Hello {new_user.full_name}, your account has been registered. You can now reserve parking slots completely FREE.",
        type="success"
    )
    db.add(welcome_notif)
    db.commit()

    token_expire = timedelta(days=7)  # Generous duration for college testing
    token = create_access_token(data={"sub": new_user.email, "role": new_user.role}, expires_delta=token_expire)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "full_name": new_user.full_name,
            "email": new_user.email,
            "mobile": new_user.mobile,
            "role": new_user.role,
            "vehicle": {
                "plate_number": new_vehicle.plate_number,
                "vehicle_type": new_vehicle.vehicle_type,
                "vehicle_model": new_vehicle.vehicle_model
            }
        }
    }

@router.post("/login", response_model=TokenResponse)
def login_user(data: UserLogin, db: Session = Depends(get_db)):
    """Authenticates users (Customer or Administrator) and returns JWT bearer token."""
    user = db.query(User).filter(User.email == data.email.lower().strip()).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please verify credentials."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is currently disabled. Please contact administrator."
        )

    expire_delta = timedelta(days=30) if data.remember_me else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(data={"sub": user.email, "role": user.role}, expires_delta=expire_delta)

    # Fetch default vehicle
    default_v = next((v for v in user.vehicles if v.is_default), user.vehicles[0] if user.vehicles else None)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "mobile": user.mobile,
            "role": user.role,
            "vehicle": {
                "plate_number": default_v.plate_number,
                "vehicle_type": default_v.vehicle_type,
                "vehicle_model": default_v.vehicle_model
            } if default_v else None
        }
    }

@router.get("/me")
def get_current_profile(current_user: User = Depends(get_current_user)):
    """Returns profile information and registered vehicles for the active session."""
    vehicles = [
        {
            "id": v.id,
            "plate_number": v.plate_number,
            "vehicle_type": v.vehicle_type,
            "vehicle_model": v.vehicle_model,
            "is_default": v.is_default
        }
        for v in current_user.vehicles
    ]
    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "mobile": current_user.mobile,
        "role": current_user.role,
        "created_at": current_user.created_at,
        "vehicles": vehicles
    }

@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Simulates password reset workflow for the college demonstration."""
    user = db.query(User).filter(User.email == data.email.lower().strip()).first()
    if not user:
        return {
            "success": True,
            "message": "If an account with that email exists, password reset instructions have been dispatched."
        }

    return {
        "success": True,
        "message": f"Password reset link generated for {user.email}. (Demo note: For instant testing, you can log in with password 'Customer@123' or 'Admin@123')"
    }

@router.get("/demo-credentials")
def get_demo_credentials():
    """Returns sample pre-configured accounts for rapid examiner testing."""
    return {
        "administrator": {
            "email": "admin@smartpark.ai",
            "password": "Admin@123",
            "role": "admin",
            "features": "Full management, Area/Slot CRUD, Analytics, Manual Override"
        },
        "customer": {
            "email": "customer@smartpark.ai",
            "password": "Customer@123",
            "role": "customer",
            "features": "AI recommendations, visual slot selection, free bookings, QR code pass"
        }
    }
