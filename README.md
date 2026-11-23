# SMART PARK AI – Intelligent Car Parking Reservation & Vehicle Detection System

![SMART PARK AI](https://img.shields.io/badge/System-Smart%20Park%20AI-00E5FF?style=for-the-badge)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![OpenCV](https://img.shields.io/badge/Vision-OpenCV%20%7C%20YOLO-5C3EE8?style=for-the-badge&logo=opencv&logoColor=white)
![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20Tailwind-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Database](https://img.shields.io/badge/Database-SQLite%20Relational-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![Cost](https://img.shields.io/badge/Pricing-100%25%20FREE-10B981?style=for-the-badge)

A comprehensive, production-grade College Final Year Engineering Project demonstrating the fusion of **Artificial Intelligence**, **Computer Vision (OpenCV / YOLO)**, **QR Code Verification**, **Rule-based Algorithmic Slot Allocation**, and **Live Facility Occupancy Management**.

---

## 🌟 1. Project Objectives & Core Features

- **100% Free Smart Parking Reservations**: Fully functional booking workflow without payment gateways, credit cards, or hidden fees.
- **Strict Double-Booking & Overlap Prevention**: Database transactions detect and reject overlapping reservations for the same slot on the same date/time window.
- **AI Parking Recommendation Engine**: Evaluates available bays using a multi-factor fitness model (distance to terminal entrance, vehicle footprint compatibility, area congestion rate).
- **Interactive Visual Parking Facility Layout**: Real-world visual bays with live status color codes:
  - 🟢 **Green** = Available
  - 🔴 **Red** = Occupied
  - 🟡 **Yellow** = Reserved
  - 🔵 **Blue** = Selected
  - ⚫ **Grey** = Disabled (Maintenance)
- **Digital QR Code Entry Passes**: High-resolution cryptographic QR passes generated upon reservation for instant gate barrier clearance.
- **Browser-Based QR Scanner**: In-browser camera QR scanner with fallback manual booking ID verification.
- **AI Computer Vision Vehicle & Plate Studio**: OpenCV pipeline detects vehicle body, classifies vehicle type, localizes license plates, runs OCR, and cross-checks active database reservations.
- **Live Occupancy Monitoring**: Real-time meters, percentage gauges, and capacity bars across Area A, Area B, and Area C.
- **Role-Based Access Control (RBAC)**: Strict segregation between Customer accounts and Administrator control panels.

---

## 👥 2. Demonstration Credentials (For Project Presentation)

| Role | Email | Password | Privileges |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@smartpark.ai` | `Admin@123` | Full control, Area/Slot CRUD, manual gate override, analytics, audit logs |
| **Demo Customer** | `customer@smartpark.ai` | `Customer@123` | AI recommendations, visual booking, QR pass generation, booking history |

*Note: The website includes **1-Click Demo Buttons** on the sign-in page for instant examiner demonstration.*

---

## 🚗 3. Pre-Configured Test Vehicles (Demo Assets)

The system includes pre-calibrated test vehicle graphics in `backend/demo_assets/` for rapid examiner testing:

1. **Demo Car 1 (`demo_car_1`)**: White Executive Sedan (`MH 12 AB 1234`)
2. **Demo Car 2 (`demo_car_2`)**: Crimson Premium SUV (`DL 01 CA 5678`)
3. **Demo Car 3 (`demo_car_3`)**: Electric Blue EV (`KA 05 MN 9999`)

---

## 🏗️ 4. Architecture & Database Design

### Relational Schema (SQLite / SQLAlchemy)

The database comprises 8 primary relational tables:
1. `users`: Customer and Admin credentials, contact details, RBAC roles.
2. `vehicles`: Vehicle registration number, classification (Sedan, SUV, EV, etc.), model.
3. `parking_areas`: Parking wings (Area A - North Ground, Area B - East Premium, Area C - South EV).
4. `parking_slots`: Slot number (`A-01`, `B-03`), bay type, distance from entrance, status, compatibility.
5. `bookings`: Unique reservation code (`SP-YYYYMMDD-XXXX`), user ID, slot ID, time window, QR base64, status.
6. `entry_exit_logs`: Comprehensive audit trail of barrier gate ingress and egress events.
7. `vehicle_detection_logs`: Computer vision inference records, detected classes, plate OCR, confidence score.
8. `notifications`: In-app customer alert logs for booking confirmations, gate entries, and releases.

---

## 🧠 5. AI Recommendation Scoring Engine

The recommendation engine calculates a composite fit score \(S \in [0, 100]\) for every available slot:

\[
S = S_{\text{proximity}} + S_{\text{compatibility}} + S_{\text{load\_balance}} + S_{\text{preference}}
\]

- **Proximity Score (\(0 - 45\) pts)**: Inversely proportional to the physical distance in meters to the terminal entrance.
- **Compatibility Score (\(0 - 35\) pts)**:
  - EV vehicle + EV Charging Slot = \(+35\) pts.
  - SUV vehicle + Spacious Standard Slot = \(+32\) pts.
  - Compact Hatchback + Compact Slot = \(+30\) pts.
- **Area Load Balancing (\(0 - 20\) pts)**: Disperses traffic by prioritizing less congested wings to prevent gate bottlenecks.

---

## 🚀 6. Step-by-Step Windows Setup Instructions

### Prerequisites
- Windows 10 or 11
- Python 3.10, 3.11, or 3.12 installed ([Download Python](https://www.python.org/downloads/))

### Step 1: Open Terminal in Project Folder
```powershell
cd C:\Users\avina\.gemini\antigravity\scratch\smart-park-ai
```

### Step 2: Install Required Dependencies
```powershell
py -3 -m pip install -r requirements.txt
```

### Step 3: Run the Application
You can run the application with **one command**:
```powershell
py -3 run.py
```
*Or simply double-click **`start.bat`** in Windows File Explorer.*

The system will:
1. Automatically verify and initialize the SQLite database (`smart_park.db`).
2. Populate seed areas, slots, and test accounts.
3. Start the FastAPI server on `http://127.0.0.1:8000`.
4. Automatically open your default web browser to the application!

### API Documentation
Interactive Swagger UI documentation is available at:
👉 **`http://127.0.0.1:8000/docs`**

---

## 🎓 7. College Project Examiner Walkthrough Script

Follow these steps during your project viva or presentation:

1. **Landing Page Tour**: Show live metrics (system occupancy %, free bays count, zero payment policy).
2. **Customer Authentication**: Click `👤 Customer` on the login page to sign in as *Avinash Sharma*.
3. **AI Recommendation Demo**: Show the AI Fit Score card explaining why a specific bay was prioritized.
4. **Visual Slot Booking**:
   - Open **Book Parking**.
   - Show color-coded slots (Green/Red/Yellow/Blue/Grey).
   - Click an available green slot (e.g. `A-01` or `A-03`).
   - Fill arrival time and click **CONFIRM FREE BOOKING**.
   - Show the generated cryptographic QR pass and printable ticket.
5. **Gate Entry QR Scanner**:
   - Navigate to **Gate Scanner**.
   - Switch to **Entrance Gate Scanner**.
   - Enter or scan the booking pass code.
   - Show the green barrier pass approval and slot status turning to **Parked**.
6. **Computer Vision Vehicle Studio**:
   - Navigate to **AI Vehicle CV**.
   - Select **Demo Car 1 (`MH 12 AB 1234`)**.
   - Click **Run Computer Vision Analysis**.
   - Show the OpenCV HUD bounding box around the vehicle and the green box around the license plate.
   - Verify that the database matched the plate and unlocked the barrier!
7. **Live Occupancy Update**: Show the capacity utilization gauge increase in real time.
8. **Admin Control Panel**:
   - Click `🛡️ Admin` in the top bar.
   - Show the customer directory, all bookings search, manual status override, and CSV report export.
