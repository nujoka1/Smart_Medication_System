#!/usr/bin/env python3
"""
MedSystem MVP - Complete Medication Dispensing Pipeline
"""
import sys
sys.path.insert(0, '/home/admin/pilldispenser/src')

from ai.pill_detector import PillDetector
from display.framebuffer_ui import MedSystemDisplay
import time
import subprocess

class MedSystemMVP:
    def __init__(self):
        self.detector = PillDetector()
        self.display = MedSystemDisplay()
        print("✓ MedSystem initialized")
    
    def capture_pill_image(self):
        """Use rpicam-still to capture"""
        subprocess.run([
            'rpicam-still', '-o', '/tmp/pill_capture.jpg',
            '--timeout', '1000'
        ], capture_output=True)
        return '/tmp/pill_capture.jpg'
    
    def dispense_medication(self, compartment):
        """TODO: Activate stepper motor"""
        print(f"→ Dispensing from compartment {compartment}")
        time.sleep(1)  # Simulate dispense
    
    def verify_pill(self, image_path):
        """Run pill detection"""
        result = self.detector.detect(image_path)
        return result
    
    def run_cycle(self, patient_name="John Doe", medication="Aspirin 500mg", compartment=1):
        """Complete dispensing cycle"""
        
        # Show dispensing
        self.display.show_dispensing(patient_name, medication)
        time.sleep(1)
        
        # Dispense
        self.dispense_medication(compartment)
        
        # Capture image
        print("→ Capturing pill image...")
        image_path = self.capture_pill_image()
        
        # Verify
        print("→ Verifying pill...")
        result = self.verify_pill(image_path)
        
        # Show result
        if result:
            self.display.show_success(result['class'])
            print(f"✓ Verified: {result['class']}")
        else:
            self.display.show_error("Verification failed")
        
        time.sleep(2)
        self.display.show_idle()
    
    def shutdown(self):
        self.display.close()
        print("✓ MedSystem shutdown")

if __name__ == "__main__":
    system = MedSystemMVP()
    
    try:
        # Test one complete cycle
        system.run_cycle(
            patient_name="Test Patient",
            medication="Aspirin 500mg",
            compartment=1
        )
    except KeyboardInterrupt:
        system.shutdown()

