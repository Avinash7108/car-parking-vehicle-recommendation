import os
from PIL import Image, ImageDraw, ImageFont
import numpy as np
import cv2
from pathlib import Path

def create_sample_car(plate_text: str, car_type: str, color_body: tuple, output_path: str):
    width, height = 800, 500
    img = Image.new("RGB", (width, height), (220, 225, 230)) # Parking asphalt/concrete background
    draw = ImageDraw.Draw(img)

    # Draw parking bay lines
    draw.line([(60, 480), (140, 150)], fill=(255, 255, 255), width=6)
    draw.line([(740, 480), (660, 150)], fill=(255, 255, 255), width=6)
    draw.rectangle([(200, 20), (600, 70)], fill=(40, 50, 60))
    draw.text((280, 30), f"BAY PARKING ZONE - {car_type.upper()}", fill=(200, 230, 255))

    # Car Chassis / Front View
    # Wheels / Tires
    draw.rounded_rectangle([(150, 320), (220, 440)], radius=15, fill=(20, 20, 20))
    draw.rounded_rectangle([(580, 320), (650, 440)], radius=15, fill=(20, 20, 20))

    # Car Body Main
    draw.rounded_rectangle([(170, 180), (630, 410)], radius=35, fill=color_body, outline=(30, 30, 30), width=4)

    # Cabin & Windshield
    draw.polygon([(240, 180), (300, 90), (500, 90), (560, 180)], fill=(50, 80, 100), outline=(20, 20, 20))
    draw.line([(398, 90), (398, 180)], fill=(30, 40, 50), width=3) # Rearview mirror / divider

    # Headlights
    draw.ellipse([(190, 230), (270, 275)], fill=(255, 250, 200), outline=(200, 180, 50), width=3)
    draw.ellipse([(530, 230), (610, 275)], fill=(255, 250, 200), outline=(200, 180, 50), width=3)

    # Front Grille
    draw.rounded_rectangle([(300, 240), (500, 310)], radius=10, fill=(30, 30, 35), outline=(100, 100, 110), width=3)
    for y in range(252, 305, 12):
        draw.line([(310, y), (490, y)], fill=(80, 85, 95), width=2)

    # Front Bumper
    draw.rounded_rectangle([(180, 330), (620, 405)], radius=12, fill=(40, 45, 50), outline=(20, 20, 20), width=3)

    # License Plate Box (High Contrast Standard White/Yellow Plate)
    plate_bg = (255, 255, 255) if "DL" in plate_text or "MH" in plate_text else (34, 180, 100) # Green for EV!
    plate_fg = (0, 0, 0) if "DL" in plate_text or "MH" in plate_text else (255, 255, 255)

    draw.rounded_rectangle([(310, 345), (490, 395)], radius=6, fill=plate_bg, outline=(20, 20, 20), width=4)
    # Blue IND strip on left of plate
    draw.rectangle([(312, 347), (330, 393)], fill=(0, 60, 180))
    draw.text((315, 360), "IND", fill=(255, 255, 255))

    # Plate Number Text
    draw.text((342, 357), plate_text, fill=plate_fg)

    # Save image
    img.save(output_path, "JPEG", quality=95)
    print(f"Created: {output_path}")

if __name__ == "__main__":
    assets_dir = Path(r"C:\Users\avina\.gemini\antigravity\scratch\smart-park-ai\backend\demo_assets")
    assets_dir.mkdir(parents=True, exist_ok=True)
    
    create_sample_car("MH 12 AB 1234", "White Sedan", (230, 235, 240), str(assets_dir / "demo_car_1.jpg"))
    create_sample_car("DL 01 CA 5678", "Crimson SUV", (180, 30, 40), str(assets_dir / "demo_car_2.jpg"))
    create_sample_car("KA 05 MN 9999", "Electric Blue EV", (30, 110, 200), str(assets_dir / "demo_car_3.jpg"))
