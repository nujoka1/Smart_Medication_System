#!/usr/bin/env python3
"""
3-Motor dispense controller for Smart Medication Dispenser.

Enabled dispense paths:
Motor 1 -> IR1
Motor 3 -> IR3
Motor 5 -> IR5

Production dispense rule:
- Stepper rotates continuously.
- Each pill is counted on a CLEAR -> DETECT transition from the paired IR sensor.
- The IR must return CLEAR before the next pill can be counted.
- The stepper stops immediately when actual_count == target_count.
- Safety timeout / hardware failure remain emergency stop conditions.

Motors 2, 4, 6 remain disabled until Hardware Revision 2.
"""

import time
import smbus2


STEPPER_ADDRS = [0x27, 0x26, 0x25]
SAFE_OFF = 0x00

IR_ADDR = 0x23
BUZZER_PIN = 6

# PCF8574 input pins must be written HIGH.
# Keep buzzer P6 LOW/OFF while reading IR inputs.
IR_INPUT_VALUE = 0xFF & ~(1 << BUZZER_PIN)

ENABLED_PATHS = {
    1: {
        "name": "Motor 1",
        "addr": 0x27,
        "pins": [0, 2, 1, 4],
        "ir_id": 1,
        "ir_pin": 0,
        "compartment": 1,
    },
    3: {
        "name": "Motor 3",
        "addr": 0x26,
        "pins": [0, 2, 1, 4],
        "ir_id": 3,
        "ir_pin": 2,
        "compartment": 3,
    },
    5: {
        "name": "Motor 5",
        "addr": 0x25,
        "pins": [0, 2, 1, 4],
        "ir_id": 5,
        "ir_pin": 4,
        "compartment": 5,
    },
}

DISABLED_PATHS = {
    2: "Hardware Revision 2",
    4: "Hardware Revision 2",
    6: "Hardware Revision 2",
}


class DispenseController:
    def __init__(self, bus_id=1):
        self.bus = smbus2.SMBus(bus_id)

    def all_steppers_off(self):
        for addr in STEPPER_ADDRS:
            self.bus.write_byte(addr, SAFE_OFF)

    def prepare_ir_inputs(self):
        self.bus.write_byte(IR_ADDR, IR_INPUT_VALUE)

    def read_ir(self, ir_pin):
        self.prepare_ir_inputs()
        time.sleep(0.002)
        raw = self.bus.read_byte(IR_ADDR)
        bit = (raw >> ir_pin) & 1

        # IR sensors are active LOW:
        # 0 = DETECT, 1 = CLEAR
        detected = bit == 0
        return detected, raw

    def make_value(self, active_pins):
        value = SAFE_OFF
        for pin in active_pins:
            value |= (1 << pin)   # HIGH = ON
        return value

    def get_sequence(self, motor, reverse=False):
        if motor not in ENABLED_PATHS:
            raise ValueError("Only motors 1, 3, and 5 are enabled.")

        pins = ENABLED_PATHS[motor]["pins"]
        a, b, c, d = pins

        # Full-step two-phase: two coils ON together.
        sequence = [
            [a, b],
            [b, c],
            [c, d],
            [d, a],
        ]

        if reverse:
            sequence = list(reversed(sequence))

        return sequence

    @staticmethod
    def default_timeout_for_count(target_count):
        """Generous safety ceiling; pill count remains the normal stop condition."""
        target_count = int(target_count)
        # 1 pill=120 s, 2=180 s, 3=240 s, 4=300 s, 5=360 s
        return min(360.0, 60.0 + (60.0 * target_count))

    def dispense_until_count(
        self,
        motor,
        target_count=1,
        delay_us=10000,
        start_us=35000,
        timeout_s=None,
        reverse=False,
        clear_confirm_s=0.03,
    ):
        """
        Continuously rotate a motor until the paired IR sensor confirms the
        requested number of pills.

        Counting state machine:
            CLEAR -> armed
            DETECT while armed -> count + 1, disarm
            return to CLEAR -> re-arm for next pill

        There is deliberately no fixed pause after a pill detection; motor
        stepping continues until the requested count is reached.
        """
        if motor not in ENABLED_PATHS:
            raise ValueError(
                f"Motor {motor} is disabled. Only motors 1, 3, and 5 are enabled."
            )

        target_count = int(target_count)
        delay_us = int(delay_us)
        start_us = int(start_us)

        if target_count <= 0:
            raise ValueError("target_count must be at least 1")
        if target_count > 5:
            raise ValueError("For safety, target_count cannot exceed 5")
        if delay_us < 7000:
            raise ValueError("delay_us too low. Use 7000 or higher")

        if timeout_s is None:
            timeout_s = self.default_timeout_for_count(target_count)
        timeout_s = float(timeout_s)

        if timeout_s <= 0:
            raise ValueError("timeout_s must be greater than 0")
        if timeout_s > 360:
            raise ValueError("timeout_s cannot exceed 360 seconds")

        clear_confirm_s = max(0.0, float(clear_confirm_s))

        cfg = ENABLED_PATHS[motor]
        addr = cfg["addr"]
        ir_pin = cfg["ir_pin"]
        sequence = self.get_sequence(motor, reverse=reverse)

        count = 0
        step_index = 0
        start_time = time.monotonic()
        ramp_steps = 200

        self.all_steppers_off()
        self.prepare_ir_inputs()
        time.sleep(0.3)

        initial_detected, initial_raw = self.read_ir(ir_pin)

        # If the beam is already blocked at startup, do not count it as a new
        # pill. Wait for CLEAR before arming the next detection.
        armed = not initial_detected
        clear_since = time.monotonic() if armed else None

        result = {
            "success": False,
            "motor": motor,
            "motor_name": cfg["name"],
            "addr": hex(addr),
            "pins": cfg["pins"],
            "ir_id": cfg["ir_id"],
            "ir_pin": ir_pin,
            "compartment": cfg["compartment"],
            "target_count": target_count,
            "actual_count": 0,
            "delay_us": delay_us,
            "start_us": start_us,
            "timeout_s": timeout_s,
            "reverse": reverse,
            "initial_ir_raw": format(initial_raw, "08b"),
            "initial_ir_detected": initial_detected,
            "drive_mode": "full-step two-phase",
            "counting_mode": "continuous_clear_detect_rearm",
            "safe_off": hex(SAFE_OFF),
            "events": [],
            "reason": None,
        }

        try:
            while count < target_count:
                elapsed = time.monotonic() - start_time

                if elapsed >= timeout_s:
                    result["reason"] = "TIMEOUT"
                    break

                # Keep the stepper moving continuously.
                active = sequence[step_index % len(sequence)]
                value = self.make_value(active)
                self.bus.write_byte(addr, value)

                if step_index < ramp_steps:
                    ratio = step_index / ramp_steps
                    current_delay = start_us - ((start_us - delay_us) * ratio)
                else:
                    current_delay = delay_us

                time.sleep(current_delay / 1_000_000.0)
                step_index += 1

                # Read the paired pill sensor after every motor step.
                detected, raw = self.read_ir(ir_pin)
                now = time.monotonic()

                if detected:
                    clear_since = None

                    if armed:
                        count += 1
                        armed = False

                        result["events"].append({
                            "count": count,
                            "target": target_count,
                            "elapsed_s": round(now - start_time, 3),
                            "ir_raw": format(raw, "08b"),
                            "event": "PILL_DETECTED",
                        })

                        # The while condition will stop the motor immediately
                        # after the target count is reached.

                else:
                    # Sensor is CLEAR. Require a short stable-clear interval
                    # before re-arming, which provides debounce without ever
                    # pausing motor rotation.
                    if clear_since is None:
                        clear_since = now

                    if not armed and (now - clear_since) >= clear_confirm_s:
                        armed = True
                        result["events"].append({
                            "count": count,
                            "target": target_count,
                            "elapsed_s": round(now - start_time, 3),
                            "ir_raw": format(raw, "08b"),
                            "event": "IR_REARMED",
                        })

            self.all_steppers_off()

            result["actual_count"] = count
            result["steps_executed"] = step_index
            result["elapsed_s"] = round(time.monotonic() - start_time, 3)

            if count == target_count:
                result["success"] = True
                result["reason"] = "COUNT_REACHED"
            elif result["reason"] is None:
                result["reason"] = "COUNT_NOT_REACHED"

            return result

        except Exception as exc:
            result["reason"] = "HARDWARE_ERROR"
            result["error"] = str(exc)
            result["actual_count"] = count
            result["steps_executed"] = step_index
            result["elapsed_s"] = round(time.monotonic() - start_time, 3)
            return result

        finally:
            # Safety invariant: never leave coils energised after this call.
            self.all_steppers_off()
            self.prepare_ir_inputs()

    def close(self):
        try:
            self.all_steppers_off()
        finally:
            self.bus.close()


def list_dispense_paths():
    return {
        "enabled": {
            str(k): {
                "name": v["name"],
                "addr": hex(v["addr"]),
                "pins": v["pins"],
                "ir_id": v["ir_id"],
                "ir_pin": v["ir_pin"],
                "compartment": v["compartment"],
                "status": "enabled",
            }
            for k, v in ENABLED_PATHS.items()
        },
        "disabled": {
            str(k): {
                "status": "coming_soon",
                "reason": reason,
            }
            for k, reason in DISABLED_PATHS.items()
        },
        "drive_mode": "full-step two-phase",
        "counting_mode": "continuous_clear_detect_rearm",
        "safe_off": hex(SAFE_OFF),
        "logic": "HIGH=ON, LOW=OFF",
        "recommended_delay_us": 10000,
    }
