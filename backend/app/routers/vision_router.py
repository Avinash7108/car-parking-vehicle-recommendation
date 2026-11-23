import os
import cv2
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import VehicleDetectionLog, User
from ..schemas import VehicleDetectRequest
from ..config import DEMO_ASSETS_DIR
from ..ai_engine.vehicle_detector import (
    decode_base64_image,
    encode_image_base64,
    detect_vehicles_and_plate,
    process_vehicle_verification
)
from ..auth import get_current_user

router = APIRouter(prefix="/api/vision", tags=["Computer Vision & Vehicle Detection"])

@router.get("/demo-images")
def get_demo_images():
    """Returns sample test vehicle assets with license plates for college demonstration."""
    demo_list = [
        {
            "id": "demo_car_1",
            "name": "White Executive Sedan",
            "vehicle_type": "Sedan",
            "plate_number": "MH 12 AB 1234",
            "description": "Standard ground wing vehicle with standard front registration plate.",
            "file": "demo_car_1.jpg"
        },
        {
            "id": "demo_car_2",
            "name": "Crimson Premium SUV",
            "vehicle_type": "SUV",
            "plate_number": "DL 01 CA 5678",
            "description": "Heavy chassis utility vehicle with wide front grille and high-contrast plate.",
            "file": "demo_car_2.jpg"
        },
        {
            "id": "demo_car_3",
            "name": "Electric Blue EV (Eco)",
            "vehicle_type": "EV",
            "plate_number": "KA 05 MN 9999",
            "description": "Eco electric vehicle requiring dedicated Level 2 EV charging slot.",
            "file": "demo_car_3.jpg"
        }
    ]

    # Include thumbnail base64 for direct browser rendering
    for item in demo_list:
        file_path = DEMO_ASSETS_DIR / item["file"]
        if file_path.exists():
            img = cv2.imread(str(file_path))
            if img is not None:
                item["thumbnail"] = encode_image_base64(img)

    return demo_list

@router.post("/detect")
def detect_vehicle(
    payload: VehicleDetectRequest,
    action: str = Query("ENTRY", description="ENTRY or EXIT action"),
    db: Session = Depends(get_db)
):
    """
    Executes Computer Vision pipeline:
    Vehicle Detection -> Classification -> License Plate Localization -> OCR -> Reservation Check.
    Supports real webcam snapshots, image uploads, and built-in demo test cars.
    """
    img = None
    demo_hint = None

    if payload.camera_mode == "demo" or payload.demo_image_id:
        demo_id = payload.demo_image_id or "demo_car_1"
        file_path = DEMO_ASSETS_DIR / f"{demo_id}.jpg"
        if not file_path.exists():
            raise HTTPException(status_code=404, detail=f"Demo image '{demo_id}' not found.")
        img = cv2.imread(str(file_path))
        demo_hint = demo_id

    elif payload.image_base64:
        try:
            img = decode_base64_image(payload.image_base64)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid image format: {str(e)}")

    if img is None:
        raise HTTPException(
            status_code=400,
            detail="No valid image provided. Please capture a camera frame or select a test vehicle."
        )

    # 1. Run Computer Vision Vehicle & Plate Detection
    detection_res = detect_vehicles_and_plate(img, demo_hint=demo_hint)

    # 2. Run Database Reservation Cross-Check & Slot Status Update
    verification_res = process_vehicle_verification(db, detection_res, action=action)

    return {
        "success": True,
        "mode": payload.camera_mode,
        "detection": detection_res,
        "verification": verification_res
    }

@router.get("/logs")
def get_detection_logs(limit: int = 20, db: Session = Depends(get_db)):
    """Fetches recent AI computer vision detection logs."""
    logs = db.query(VehicleDetectionLog).order_by(VehicleDetectionLog.timestamp.desc()).limit(limit).all()
    return logs
