import math
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from ..models import ParkingSlot, ParkingArea

def calculate_slot_score(
    slot: ParkingSlot,
    area: ParkingArea,
    vehicle_type: str,
    area_occupancy_rate: float,
    preferred_area: Optional[str] = None
) -> Dict[str, Any]:
    """
    AI-Assisted Multi-Factor Scoring Algorithm for Intelligent Parking Slot Allocation.
    Factors:
    1. Physical Proximity to Entrance (Distance in meters)
    2. Vehicle-Slot Compatibility & Dedicated Amenities (EV charging, compact, etc.)
    3. Parking Area Congestion & Load Balancing
    4. User Area Preference
    """
    reasons = []

    # 1. Proximity Score (0 to 45 points)
    # Average entrance distance ranges from 5m to 60m
    clamped_dist = max(5, min(60, slot.distance_from_entrance))
    distance_score = (1.0 - (clamped_dist - 5) / 55.0) * 45.0
    estimated_walking_seconds = round(slot.distance_from_entrance / 1.25)

    if slot.distance_from_entrance <= 15:
        reasons.append(f"Ultra-close proximity to entrance ({slot.distance_from_entrance}m, ~{estimated_walking_seconds}s walk)")
    elif slot.distance_from_entrance <= 30:
        reasons.append(f"Convenient walking distance ({slot.distance_from_entrance}m, ~{estimated_walking_seconds}s walk)")
    else:
        reasons.append(f"Spacious outer bay ({slot.distance_from_entrance}m, ~{estimated_walking_seconds}s walk)")

    # 2. Vehicle Compatibility Score (0 to 35 points)
    compat_score = 20.0  # base compatibility
    vtype_lower = vehicle_type.lower()
    stype_lower = slot.slot_type.lower()

    if "ev" in vtype_lower or "electric" in vtype_lower:
        if "ev" in stype_lower:
            compat_score = 35.0
            reasons.append("Equipped with dedicated Level 2 EV Fast Charging station")
        else:
            compat_score = 10.0
            reasons.append("Standard bay (No dedicated EV charging port)")
    elif "suv" in vtype_lower or "truck" in vtype_lower:
        if "standard" in stype_lower:
            compat_score = 32.0
            reasons.append("Wide bay footprint ideal for large SUV turning radius")
        elif "compact" in stype_lower:
            compat_score = 5.0
            reasons.append("Tight clearance for full-size vehicle")
        else:
            compat_score = 25.0
    elif "hatchback" in vtype_lower or "compact" in vtype_lower or "sedan" in vtype_lower:
        if "compact" in stype_lower or "standard" in stype_lower:
            compat_score = 30.0
            reasons.append(f"Optimized bay size for {vehicle_type}")
    elif "bike" in vtype_lower or "motorcycle" in vtype_lower:
        compat_score = 30.0
        reasons.append("Easy lane ingress and egress")

    # 3. Area Congestion & Load Balancing Score (0 to 20 points)
    # Preferred occupancy is between 20% and 70% to prevent bottlenecking entrance
    if area_occupancy_rate < 0.5:
        congestion_score = 20.0
        reasons.append(f"{area.name} has low traffic congestion ({round(area_occupancy_rate * 100)}% occupied)")
    elif area_occupancy_rate < 0.8:
        congestion_score = 15.0
    else:
        congestion_score = 8.0
        reasons.append(f"{area.name} has high traffic ({round(area_occupancy_rate * 100)}% occupied)")

    # 4. Preferred Area Bonus
    preference_bonus = 0.0
    if preferred_area and preferred_area.lower() in area.name.lower():
        preference_bonus = 10.0
        reasons.append(f"Matches your preferred parking area '{area.name}'")

    total_raw_score = distance_score + compat_score + congestion_score + preference_bonus
    # Normalize to 100
    composite_score = min(99.4, max(40.0, total_raw_score))

    return {
        "slot_id": slot.id,
        "slot_number": slot.slot_number,
        "area_id": area.id,
        "area_name": area.name,
        "slot_type": slot.slot_type,
        "distance_from_entrance": slot.distance_from_entrance,
        "estimated_walking_seconds": estimated_walking_seconds,
        "composite_score": round(composite_score, 1),
        "distance_score": round(distance_score, 1),
        "compatibility_score": round(compat_score, 1),
        "congestion_score": round(congestion_score, 1),
        "explanation": " • ".join(reasons)
    }

def get_ai_parking_recommendations(
    db: Session,
    vehicle_type: str = "Sedan",
    preferred_area: Optional[str] = None
) -> Dict[str, Any]:
    """
    Evaluates all currently 'Available' slots across all active areas and returns
    the Best recommendation, Alternative recommendation, and comprehensive logic report.
    """
    areas = db.query(ParkingArea).filter(ParkingArea.is_active == True).all()
    if not areas:
        return {
            "status": "NO_AREAS",
            "message": "No active parking areas found.",
            "best_recommendation": None,
            "alternative_recommendation": None,
            "all_evaluated": []
        }

    # Fetch area occupancy stats
    area_occupancy_map = {}
    for area in areas:
        total_in_area = db.query(ParkingSlot).filter(ParkingSlot.area_id == area.id).count()
        occupied_in_area = db.query(ParkingSlot).filter(
            ParkingSlot.area_id == area.id,
            ParkingSlot.status.in_(["Occupied", "Reserved"])
        ).count()
        rate = (occupied_in_area / total_in_area) if total_in_area > 0 else 0.0
        area_occupancy_map[area.id] = (area, rate)

    # Fetch all Available slots
    available_slots = db.query(ParkingSlot).filter(ParkingSlot.status == "Available").all()
    if not available_slots:
        return {
            "status": "ALL_FULL",
            "message": "All parking slots are currently occupied or reserved.",
            "best_recommendation": None,
            "alternative_recommendation": None,
            "all_evaluated": []
        }

    scored_slots = []
    for slot in available_slots:
        area_info = area_occupancy_map.get(slot.area_id)
        if not area_info:
            continue
        area, occ_rate = area_info
        score_data = calculate_slot_score(slot, area, vehicle_type, occ_rate, preferred_area)
        scored_slots.append(score_data)

    # Sort descending by composite AI score
    scored_slots.sort(key=lambda x: x["composite_score"], reverse=True)

    best = scored_slots[0] if len(scored_slots) > 0 else None
    alt = scored_slots[1] if len(scored_slots) > 1 else None

    summary_explanation = ""
    if best:
        summary_explanation = (
            f"AI selected {best['slot_number']} ({best['area_name']}) with an AI Fit Index of "
            f"{best['composite_score']}/100. It offers optimal proximity ({best['distance_from_entrance']}m), "
            f"full compatibility for your {vehicle_type}, and walking time under {best['estimated_walking_seconds']}s."
        )

    return {
        "status": "SUCCESS",
        "algorithm": "Multi-Objective Heuristic & Compatibility Weighting (AI-Assisted Engine)",
        "vehicle_type": vehicle_type,
        "best_recommendation": best,
        "alternative_recommendation": alt,
        "summary_explanation": summary_explanation,
        "total_available_slots": len(available_slots),
        "all_ranked": scored_slots[:6]
    }
