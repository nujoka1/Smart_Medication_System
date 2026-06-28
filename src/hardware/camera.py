#!/usr/bin/env python3
"""
PillCamera - OV5647 Real Image Capture via libcamera/picamera2
"""
import os
from picamera2 import Picamera2
from PIL import Image
import time

class PillCamera:
    def __init__(self, resolution=(1296, 972)):
        """Initialize OV5647 camera on RPi 4B"""
        try:
            self.camera = Picamera2()
            config = self.camera.create_preview_configuration(
                main={"format": 'BGR888', "size": resolution}
            )
            self.camera.configure(config)
            self.camera.start()
            self.resolution = resolution
            print(f"✓ Camera initialized: {resolution}")
        except Exception as e:
            print(f"✗ Camera init failed: {e}")
            self.camera = None
    
    def capture_still(self, filepath="/tmp/pill_capture.jpg"):
        """Capture single still image for pill verification"""
        if not self.camera:
            print("Camera not available")
            return None
        
        try:
            # Capture to memory then save
            array = self.camera.capture_array()
            img = Image.fromarray(array)
            img.save(filepath)
            print(f"✓ Captured: {filepath}")
            return filepath
        except Exception as e:
            print(f"✗ Capture failed: {e}")
            return None
    
    def close(self):
        """Cleanup"""
        if self.camera:
            self.camera.stop()
            print("✓ Camera closed")

# Test
if __name__ == "__main__":
    cam = PillCamera()
    path = cam.capture_still()
    if path:
        print(f"Image saved to: {path}")
    cam.close()

