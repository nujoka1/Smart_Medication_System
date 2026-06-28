"""
MedSystem Main Entry Point
State machine: IDLE → ALERT → AUTH → DISPENSE → VERIFY → LOG → IDLE
"""

import time, logging, logging.handlers, sys
from datetime import datetime
from pathlib import Path

# ── Logging setup ─────────────────────────────────────────
Path("logs").mkdir(exist_ok=True)
handler = logging.handlers.RotatingFileHandler(
    "logs/medsystem.log", maxBytes=5*1024*1024, backupCount=3
)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[handler, logging.StreamHandler(sys.stdout)]
)
log = logging.getLogger("main")

# ── Imports ───────────────────────────────────────────────
from config import AIConfig, ScheduleConfig, DBConfig
from src.core.database import init_db, get_session, seed_demo_data, DispenseLog
from src.hardware.gpio_controller import GPIOController
from src.hardware.servo import ServoController
from src.hardware.ir_sensors import IRSensorArray
from src.hardware.camera import CameraController
from src.ai.detector import PillDetector

# ── State Machine States ──────────────────────────────────
class State:
    IDLE     = "IDLE"
    ALERT    = "ALERT"
    AUTH     = "AUTH"
    DISPENSE = "DISPENSE"
    VERIFY   = "VERIFY"
    LOG      = "LOG"
    ERROR    = "ERROR"

class MedSystem:
    def __init__(self):
        log.info("=== MedSystem Starting ===")

        # Database
        self.engine  = init_db()
        seed_demo_data(self.engine)

        # Hardware
        self.gpio    = GPIOController()
        self.servo   = ServoController(self.gpio)
        self.ir      = IRSensorArray()
        self.camera  = CameraController(self.gpio)
        self.ai      = PillDetector(AIConfig.MODEL_PATH,
                                    AIConfig.CONFIDENCE,
                                    AIConfig.IOU_THRESHOLD,
                                    AIConfig.IMG_SIZE)

        self.state          = State.IDLE
        self.current_schedule = None
        log.info("✓ All systems initialised")

    def check_schedule(self) -> object | None:
        """Check if any dose is due right now."""
        now  = datetime.now()
        hhmm = now.strftime("%H:%M")
        dow  = str(now.weekday())

        with get_session(self.engine) as s:
            from src.core.database import Schedule
            due = s.query(Schedule).filter(
                Schedule.dose_time == hhmm,
                Schedule.active    == True
            ).all()
            for sched in due:
                if dow in sched.days_of_week:
                    log.info(f"Dose due: {sched.medication.name} for {sched.patient.name}")
                    return sched
        return None

    def log_event(self, schedule, outcome: str, detected=None,
                  confidence=None, weight=None, notes=""):
        with get_session(self.engine) as s:
            entry = DispenseLog(
                patient_id   = schedule.patient_id if schedule else None,
                schedule_id  = schedule.id if schedule else None,
                expected_med = schedule.medication.name if schedule else "unknown",
                detected_med = detected,
                confidence   = confidence,
                weight_g     = weight,
                outcome      = outcome,
                notes        = notes
            )
            s.add(entry)
            s.commit()
        log.info(f"Event logged: {outcome}")

    def run(self):
        """Main control loop."""
        log.info("System running. Press Ctrl+C to stop.")
        self.gpio.led_green(True)   # steady green = system ready

        try:
            while True:
                # ── IDLE: poll schedule ──────────────────
                if self.state == State.IDLE:
                    schedule = self.check_schedule()
                    if schedule:
                        self.current_schedule = schedule
                        self.state = State.ALERT

                # ── ALERT: notify patient ────────────────
                elif self.state == State.ALERT:
                    log.info("STATE: ALERT")
                    self.gpio.led_green(False)
                    self.gpio.blink(self.gpio.LED_RED, times=3)
                    self.gpio.beep(0.5)
                    # In full system: wait for RFID scan here
                    # For MVP demo: auto-advance after alert
                    self.state = State.DISPENSE

                # ── DISPENSE ─────────────────────────────
                elif self.state == State.DISPENSE:
                    log.info("STATE: DISPENSE")
                    comp = self.current_schedule.medication.compartment
                    qty = self.current_schedule.dose_quantity
                    if qty > 1:
                        success = self.servo.dispense_multiple(comp, qty)
                    else:
                        success = self.servo.dispense(comp)
                    if success:
                        self.state = State.VERIFY
                    else:
                        self.log_event(self.current_schedule, "error",
                                      notes="Servo homing failed")
                        self.state = State.ERROR

                # ── VERIFY: camera + AI ───────────────────
                elif self.state == State.VERIFY:
                    log.info("STATE: VERIFY")
                    img_path = f"data/capture_{datetime.now():%Y%m%d_%H%M%S}.jpg"
                    captured = self.camera.capture(img_path)

                    if captured:
                        expected = [self.current_schedule.medication.ai_class_name]
                        result   = self.ai.verify(captured, expected)

                        if result["pass"]:
                            self.gpio.alert_success()
                            det = result["detections"][0] if result["detections"] else {}
                            self.log_event(
                                self.current_schedule, "success",
                                detected   = det.get("class"),
                                confidence = det.get("confidence")
                            )
                        else:
                            self.gpio.alert_failure()
                            self.log_event(
                                self.current_schedule, "wrong_pill",
                                notes=f"Missing:{result['missing']} "
                                      f"Unexpected:{result['unexpected']}"
                            )
                    else:
                        self.log_event(self.current_schedule, "error",
                                      notes="Camera capture failed")

                    self.state   = State.IDLE
                    self.current_schedule = None
                    self.gpio.led_green(True)

                # ── ERROR ─────────────────────────────────
                elif self.state == State.ERROR:
                    log.error("System error — check hardware")
                    self.gpio.alert_failure()
                    time.sleep(5)
                    self.state = State.IDLE
                    self.gpio.led_green(True)

                time.sleep(ScheduleConfig.CHECK_INTERVAL)

        except KeyboardInterrupt:
            log.info("Shutdown requested")
        finally:
            self.camera.release()
            self.servo.stop()
            self.ir.cleanup()
            self.gpio.cleanup()
            log.info("=== MedSystem Stopped ===")

if __name__ == "__main__":
    MedSystem().run()
