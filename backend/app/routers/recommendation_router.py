from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from ..database import get_db
from ..schemas import RecommendationRequest
from ..auth import get_current_user
from ..models import User
from ..ai_engine.recommendation import get_ai_parking_recommendations

router = APIRouter(prefix="/api/recommendations", tags=["AI Parking Recommendations"])

@router.get("")
@router.get("/")
def get_recommendations_get(
    vehicle_type: Optional[str] = Query("Sedan"),
    preferred_area: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """GET: AI-assisted parking slot recommendations."""
    return get_ai_parking_recommendations(db=db, vehicle_type=vehicle_type, preferred_area=preferred_area)

@router.post("")
@router.post("/")
def get_recommendations_post(
    data: RecommendationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """POST: AI-assisted parking slot recommendations (authenticated)."""
    return get_ai_parking_recommendations(
        db=db,
        vehicle_type=data.vehicle_type or "Sedan",
        preferred_area=data.preferred_area
    )
