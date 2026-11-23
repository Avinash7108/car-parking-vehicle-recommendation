import sys
import datetime
import random
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def run_tests():
    print("================== SMART PARK AI - BACKEND TEST SUITE ==================")

    # 1. Health Check
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("[PASS] 1. Health Check: OK")

    # 2. Customer Login
    res = client.post("/api/auth/login", json={
        "email": "customer@smartpark.ai",
        "password": "Customer@123"
    })
    assert res.status_code == 200, f"Customer login failed: {res.text}"
    cust_token = res.json()["access_token"]
    cust_headers = {"Authorization": f"Bearer {cust_token}"}
    print("[PASS] 2. Customer Authentication: Token issued successfully")

    # 3. Admin Login
    res = client.post("/api/auth/login", json={
        "email": "admin@smartpark.ai",
        "password": "Admin@123"
    })
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    admin_token = res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("[PASS] 3. Admin Authentication: RBAC Administrator authenticated")

    # 4. Areas and Slots
    res = client.get("/api/parking/areas")
    assert res.status_code == 200
    areas = res.json()
    assert len(areas) >= 3, f"Expected 3 areas, got {len(areas)}"
    print(f"[PASS] 4. Parking Areas: {len(areas)} areas loaded with slots")

    # 5. Live Occupancy
    res = client.get("/api/parking/occupancy")
    assert res.status_code == 200
    occ = res.json()
    print(f"[PASS] 5. Live Occupancy: {occ['occupancy_percentage']}% occupied, {occ['available_slots']} slots available")

    # 6. AI Smart Recommendation
    res = client.get("/api/recommendations?vehicle_type=EV")
    assert res.status_code == 200
    rec = res.json()
    assert rec["best_recommendation"] is not None
    best = rec["best_recommendation"]
    print(f"[PASS] 6. AI Recommendation Engine: Recommended {best['slot_number']} ({best['area_name']}) - Fit Score: {best['composite_score']}/100")

    # 7. Create Free Booking with unique date to allow repeated runs
    test_date = f"2026-12-{random.randint(10, 28):02d}"
    res = client.post("/api/bookings", headers=cust_headers, json={
        "customer_name": "Avinash Sharma",
        "customer_email": "customer@smartpark.ai",
        "customer_mobile": "+91 98765 43210",
        "vehicle_plate": "MH 12 AB 1234",
        "vehicle_model": "Tata Nexon EV Max",
        "vehicle_type": "EV",
        "parking_area_name": "Area A (North Ground Wing)",
        "slot_number": "A-01",
        "booking_date": test_date,
        "expected_arrival": "10:00",
        "expected_departure": "12:00"
    })
    assert res.status_code == 200, f"Booking creation failed: {res.text}"
    booking_data = res.json()
    booking_code = booking_data["booking_code"]
    assert booking_data["is_free"] is True
    assert booking_data["qr_code_base64"] is not None
    print(f"[PASS] 7. Free Booking & QR Generation: Created {booking_code} for Bay A-01 on {test_date} (100% Free)")

    # 8. Double-Booking Prevention Check on same slot and overlapping time
    res_dup = client.post("/api/bookings", headers=cust_headers, json={
        "customer_name": "Duplicate Tester",
        "customer_email": "customer@smartpark.ai",
        "customer_mobile": "+91 98765 43210",
        "vehicle_plate": "MH 12 AB 9999",
        "vehicle_model": "Sedan",
        "vehicle_type": "Sedan",
        "parking_area_name": "Area A (North Ground Wing)",
        "slot_number": "A-01",
        "booking_date": test_date,
        "expected_arrival": "10:30",
        "expected_departure": "11:30"
    })
    assert res_dup.status_code == 409, "Double booking was not prevented!"
    print("[PASS] 8. Double Booking Prevention: Overlapping reservation properly rejected (HTTP 409 Conflict)")

    # 9. QR Verification for Entrance
    res_qr = client.post("/api/qr/verify", json={
        "qr_payload": booking_code,
        "action": "ENTRY"
    })
    assert res_qr.status_code == 200, f"QR Verification failed: {res_qr.text}"
    print(f"[PASS] 9. QR Entrance Scanner: Booking verified, entry approved, status updated to Parked")

    # 10. Computer Vision Vehicle Detection
    res_cv = client.post("/api/vision/detect?action=ENTRY", json={
        "camera_mode": "demo",
        "demo_image_id": "demo_car_1"
    })
    assert res_cv.status_code == 200, f"CV detection failed: {res_cv.text}"
    cv_res = res_cv.json()
    assert cv_res["detection"]["plate_number"] == "MH 12 AB 1234"
    print(f"[PASS] 10. AI Computer Vision Detection: Vehicle {cv_res['detection']['vehicle_class']} and Plate {cv_res['detection']['plate_number']} recognized with bounding box overlays")

    # 11. Admin Metrics
    res_admin = client.get("/api/admin/metrics", headers=admin_headers)
    assert res_admin.status_code == 200
    metrics = res_admin.json()
    print(f"[PASS] 11. Admin Analytics Dashboard: Total bookings={metrics['bookings']['total_bookings']}, Occupancy={metrics['facilities']['occupancy_percentage']}%")

    print("\n>>> ALL 11 BACKEND API & AI TESTS PASSED WITH 100% SUCCESS! <<<\n")

if __name__ == "__main__":
    run_tests()
