#!/usr/bin/env python3
"""
MedSystem Main Loop - with Real-time Display
Integrates: RTC schedule → Dispensing → AI verification → Display feedback
"""
import sys
sys.path.insert(0, '/home/admin/pilldispenser/src')

from display.framebuffer_ui import MedSystemDisplay
from hardware.gpio_controller import GPIOController
from hardware.servo import ServoMotor
from hardware.camera import PillCamera
from database.models import Patient, Medication, Schedule
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
import time

class MedSystemMain:
    def __init__(self):
        self.display = MedSystemDisplay()
        self.gpio = GPIOController()
        self.camera = PillCamera()
        self.db = Session(create_engine('sqlite:////home/admin/pilldispenser/medsystem.db'))
        self.state = "IDLE"
    
    def state_idle(self):
        """Waiting for next scheduled dose"""
        self.display.show_idle()
        self.state = "IDLE"
    
    def state_dispense(self, patient_id, medication_id):
        """Dispense the medication"""
        patient = self.db.query(Patient).filter_by(id=patient_id).first()
        medication = self.db.query(Medication).filter_by(id=medication_id).first()
        
        self.display.show_dispensing(patient.name, medication.name)
        
        # TODO: Activate servo/stepper to dispense
        time.sleep(2)
        
        self.state = "VERIFY"
    
    def state_verify(self, medication):
        """Capture and verify pill"""
        # TODO: Camera capture + YOLOv8 inference
        self.display.show_success(medication)
        time.sleep(2)
        self.state = "IDLE"
    
    def state_error(self, msg):
        """Display error"""
        self.display.show_error(msg)
        time.sleep(3)
        self.state = "IDLE"
    
    def run(self):
        """Main control loop"""
        try:
            while True:
                if self.state == "IDLE":
                    self.state_idle()
                    time.sleep(1)
                
                # TODO: Check RTC for scheduled doses
                # if next_dose_due():
                #     self.state_dispense(patient_id, medication_id)
                #     self.state_verify(medication_name)
                
        except KeyboardInterrupt:
            self.shutdown()
    
    def shutdown(self):
        self.display.close()
        self.gpio.cleanup()
        print("MedSystem shutdown complete")

if __name__ == "__main__":
    system = MedSystemMain()
    system.run()

