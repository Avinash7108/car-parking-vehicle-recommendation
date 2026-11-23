import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR.parent / "static"
DEMO_ASSETS_DIR = BASE_DIR / "demo_assets"
DATA_DIR = BASE_DIR / "data"

DATA_DIR.mkdir(parents=True, exist_ok=True)
DEMO_ASSETS_DIR.mkdir(parents=True, exist_ok=True)
STATIC_DIR.mkdir(parents=True, exist_ok=True)

DATABASE_URL = f"sqlite:///{DATA_DIR / 'smart_park.db'}"

SECRET_KEY = os.getenv("SECRET_KEY", "smart-park-ai-super-secret-college-key-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

PROJECT_NAME = "AI CAR PARKING"
PROJECT_SUBTITLE = "Vehicle Recommendation & Detection System"
PROJECT_VERSION = "2.0.0"
