#!/usr/bin/env python3
"""MedSystem Display Integration - Real-time dispensing status"""
from PIL import Image, ImageDraw, ImageFont
import struct, time, json
from datetime import datetime

class MedSystemDisplay:
    def __init__(self, fb_device="/dev/fb0", width=480, height=320):
        self.fb = open(fb_device, 'r+b')
        self.width, self.height = width, height
        try:
            self.font_big = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 24)
            self.font_med = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 18)
            self.font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
        except:
            self.font_big = self.font_med = self.font_small = ImageFont.load_default()
    
    def write_image(self, image):
        rgb = image.convert('RGB')
        pixels = rgb.tobytes()
        rgb565 = bytearray()
        for i in range(0, len(pixels), 3):
            r, g, b = pixels[i], pixels[i+1], pixels[i+2]
            px = ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3)
            rgb565 += struct.pack('<H', px)
        self.fb.seek(0)
        self.fb.write(rgb565)
        self.fb.flush()
    
    def show_idle(self):
        """Idle state - waiting for next dose"""
        img = Image.new('RGB', (self.width, self.height), (20, 35, 50))
        draw = ImageDraw.Draw(img)
        draw.text((20, 60), "MEDSYSTEM", fill=(100, 200, 255), font=self.font_big)
        draw.text((20, 120), "Ready for next dose", fill=(150, 150, 150), font=self.font_med)
        draw.text((20, 160), datetime.now().strftime("%H:%M:%S"), fill=(100, 100, 100), font=self.font_small)
        self.write_image(img)
    
    def show_dispensing(self, patient, medication):
        """Dispensing in progress"""
        img = Image.new('RGB', (self.width, self.height), (50, 40, 20))
        draw = ImageDraw.Draw(img)
        draw.text((20, 30), "DISPENSING", fill=(255, 200, 0), font=self.font_big)
        draw.text((20, 90), f"Patient: {patient}", fill=(255, 255, 255), font=self.font_med)
        draw.text((20, 140), f"Med: {medication}", fill=(255, 200, 100), font=self.font_small)
        draw.text((20, 180), ">>> SCANNING <<<", fill=(255, 200, 0), font=self.font_small)
        self.write_image(img)
    
    def show_success(self, medication):
        """Pill verified and logged"""
        img = Image.new('RGB', (self.width, self.height), (20, 60, 20))
        draw = ImageDraw.Draw(img)
        draw.text((20, 80), "VERIFIED", fill=(0, 255, 100), font=self.font_big)
        draw.text((20, 150), f"{medication}", fill=(150, 255, 150), font=self.font_med)
        draw.text((20, 200), "Logged to database", fill=(100, 200, 100), font=self.font_small)
        self.write_image(img)
    
    def show_error(self, error_msg):
        """Error state"""
        img = Image.new('RGB', (self.width, self.height), (80, 20, 20))
        draw = ImageDraw.Draw(img)
        draw.text((20, 80), "ERROR", fill=(255, 100, 100), font=self.font_big)
        draw.text((20, 150), error_msg, fill=(255, 200, 200), font=self.font_small)
        self.write_image(img)
    
    def close(self):
        try:
            self.fb.close()
        except:
            pass

# Test the display states
if __name__ == "__main__":
    display = MedSystemDisplay()
    
    # Idle
    display.show_idle()
    time.sleep(2)
    
    # Dispensing
    display.show_dispensing("John Doe", "Aspirin 500mg")
    time.sleep(3)
    
    # Success
    display.show_success("Aspirin 500mg")
    time.sleep(2)
    
    # Back to idle
    display.show_idle()
    display.close()

