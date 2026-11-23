import os
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from .config import PROJECT_NAME, PROJECT_VERSION, STATIC_DIR, BASE_DIR
from .database import Base, engine
from .seed_data import seed_database

# Routers
from .routers import (
    auth_router,
    parking_router,
    recommendation_router,
    booking_router,
    qr_router,
    vision_router,
    admin_router,
    notification_router
)

# Initialize FastAPI application
app = FastAPI(
    title=PROJECT_NAME,
    version=PROJECT_VERSION,
    description="Intelligent Car Parking Reservation & AI Vehicle Detection System"
)

# Enable CORS for local cross-origin development if needed
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth_router.router)
app.include_router(parking_router.router)
app.include_router(recommendation_router.router)
app.include_router(booking_router.router)
app.include_router(qr_router.router)
app.include_router(vision_router.router)
app.include_router(admin_router.router)
app.include_router(notification_router.router)

# Mount Static Files (Frontend UI assets)
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

@app.on_event("startup")
def on_startup():
    """Initializes tables and seeds test records on app startup."""
    Base.metadata.create_all(bind=engine)
    seed_database()

@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "system": PROJECT_NAME,
        "version": PROJECT_VERSION,
        "ai_modules": ["Vehicle Detection (OpenCV/YOLO)", "License Plate Recognition", "Smart Slot Allocator"]
    }

# SPA Fallback: Serve index.html for root and client-side routes
@app.get("/")
def read_root():
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return JSONResponse(content={"message": "Frontend index.html initializing..."})

@app.get("/{full_path:path}")
def catch_all(full_path: str):
    # Don't intercept API endpoints or static files
    if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
        return JSONResponse(status_code=404, content={"detail": "Not Found"})

    target_file = STATIC_DIR / full_path
    if target_file.exists() and target_file.is_file():
        return FileResponse(str(target_file))

    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))

    return JSONResponse(status_code=404, content={"detail": "Not Found"})
