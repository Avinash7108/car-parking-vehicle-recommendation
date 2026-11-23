import os
import sys
import time
import socket
import webbrowser
import uvicorn
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from backend.app.seed_data import seed_database

def print_banner(port: int):
    banner = f"""
================================================================================
        _    ___    ____    _    ____  _  _____ _   _  ____ 
       / \  |_ _|  / ___|  / \  |  _ \| |/ /_ _| \ | |/ ___|
      / _ \  | |  | |     / _ \ | |_) | ' / | ||  \| | |  _ 
     / ___ \ | |  | |___ / ___ \|  _ <| . \ | || |\  | |_| |
    /_/   \_\___|  \____/_/   \_\_| \_\_|\_\___|_| \_|\____|
                                                            
         AI CAR PARKING & VEHICLE RECOMMENDATION SYSTEM
                 College Final Year Engineering Project
================================================================================
  DEMONSTRATION ACCESS CREDENTIALS:
  • Administrator Portal: admin@smartpark.ai    | Password: Admin@123
  • Customer Account:     customer@smartpark.ai | Password: Customer@123
  • Free Booking Bay:     100% Free (No payment gateway)
  • Web Application URL:  http://127.0.0.1:{port}
  • Swagger API Docs:     http://127.0.0.1:{port}/docs
================================================================================
    """
    print(banner)

def find_available_port(start_port: int = 8000) -> int:
    for port in [8000, 8001, 8080, 8888, 5000]:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('127.0.0.1', port))
                return port
            except OSError:
                continue
    return start_port

def main():
    print("[1/3] Initializing SQLite Relational Database & Verification Tables...")
    seed_database()
    print("[2/3] Seed data loaded successfully!")

    target_port = find_available_port(8000)
    print_banner(target_port)

    app_url = f"http://127.0.0.1:{target_port}"
    print(f"[3/3] Launching FastAPI Web Server on {app_url} ...")

    # Automatically launch default web browser after 1.5 seconds
    def open_browser():
        time.sleep(1.5)
        try:
            webbrowser.open(app_url)
        except Exception:
            pass

    import threading
    threading.Thread(target=open_browser, daemon=True).start()

    # Start Uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=target_port, reload=False, log_level="info")

if __name__ == "__main__":
    main()
