"""
IR sensor driver — one beam-break sensor per compartment.
Each sensor pulls LOW when a pill passes through the chute.
Used to COUNT pills dispensed before AI camera verification.
"""
import RPi.GPIO as GPIO
import time, logging
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))
from config import Pins

log = logging.getLogger(__name__)

class IRSensorArray:
    def __init__(self):
        self.sensors  = Pins.IR_SENSORS      # {compartment: gpio_pin}
        self._counts  = {c: 0 for c in self.sensors}
        self._cb_ids  = []
        self._active_comp = None

        for comp, pin in self.sensors.items():
            GPIO.setup(pin, GPIO.IN, pull_up_down=GPIO.PUD_UP)

        log.info(f"IR sensors initialised on pins: {list(self.sensors.values())}")

    def start_count(self, compartment: int):
        """Start counting pill-drop events on the given compartment sensor."""
        if compartment not in self.sensors:
            log.error(f"No IR sensor for compartment {compartment}")
            return
        self._active_comp = compartment
        self._counts[compartment] = 0
        pin = self.sensors[compartment]

        # Detect FALLING edge = pill breaks beam (beam-break sensor)
        cb_id = GPIO.add_event_detect(
            pin, GPIO.FALLING,
            callback=self._pill_detected,
            bouncetime=80   # 80ms debounce — ignores vibration noise
        )
        log.info(f"IR counting started: compartment {compartment} on GPIO {pin}")

    def stop_count(self, compartment: int) -> int:
        """Stop counting and return pill count."""
        if compartment in self.sensors:
            try:
                GPIO.remove_event_detect(self.sensors[compartment])
            except Exception:
                pass
        count = self._counts.get(compartment, 0)
        log.info(f"IR count stopped: compartment {compartment} → {count} pill(s)")
        self._active_comp = None
        return count

    def _pill_detected(self, channel):
        """Interrupt callback — fires on each pill drop."""
        for comp, pin in self.sensors.items():
            if pin == channel:
                self._counts[comp] += 1
                log.info(f"IR: pill detected — compartment {comp} "
                         f"count={self._counts[comp]}")
                break

    def count_pills(self, compartment: int, timeout: float = 5.0) -> int:
        """
        Count pills from compartment within timeout window.
        Blocks until timeout or no new pills detected for 1.5s.
        """
        self.start_count(compartment)
        last_count = 0
        stable_since = time.time()
        deadline = time.time() + timeout

        while time.time() < deadline:
            time.sleep(0.1)
            current = self._counts[compartment]
            if current != last_count:
                last_count = current
                stable_since = time.time()
            elif current > 0 and (time.time() - stable_since) > 1.5:
                # Count has been stable for 1.5s — dispensing done
                break

        return self.stop_count(compartment)

    def verify_count(self, compartment: int,
                     expected: int, timeout: float = 5.0) -> dict:
        """
        Dispense and verify pill count matches prescription.
        Returns result dict consumed by state machine.
        """
        actual = self.count_pills(compartment, timeout)
        passed = actual == expected
        result = {
            "pass":       passed,
            "expected":   expected,
            "actual":     actual,
            "compartment": compartment,
            "delta":      actual - expected
        }
        if passed:
            log.info(f"IR verify PASS: {actual}/{expected} pills")
        else:
            log.warning(f"IR verify FAIL: got {actual}, expected {expected}")
        return result

    def sensor_status(self) -> dict:
        """Return live beam status for all sensors — for dashboard."""
        return {
            comp: "blocked" if GPIO.input(pin) == GPIO.LOW else "clear"
            for comp, pin in self.sensors.items()
        }

    def cleanup(self):
        for pin in self.sensors.values():
            try: GPIO.remove_event_detect(pin)
            except Exception: pass
