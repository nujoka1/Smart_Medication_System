#!/usr/bin/env python3
"""
3-Motor dispense controller for Smart Medication Dispenser.

Enabled dispense paths:
Motor 1 -> IR1
Motor 3 -> IR3
Motor 5 -> IR5

Motors 2, 4, 6 remain disabled until P3 wiring is isolated.
"""

import time
import smbus2


STEPPER_ADDRS = [0x27, 0x26, 0x25]
SAFE_OFF = 0x00

IR_ADDR = 0x23
BUZZER_PIN = 6

# PCF8574 input pins must be written HIGH.
# Keep future buzzer P6 LOW for now.
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
    2: "Disabled until P3 wiring is isolated",
    4: "Disabled until P3 wiring is isolated",
    6: "Disabled until P3 wiring is isolated",
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

    def dispense_until_count(
        self,
        motor,
        target_count=1,
        delay_us=10000,
        start_us=35000,
        timeout_s=30,
        reverse=False,
        lockout_s=0.20,
    ):
        if motor not in ENABLED_PATHS:
            raise ValueError(f"Motor {motor} is disabled. Only motors 1, 3, and 5 are enabled.")

        target_count = int(target_count)
        delay_us = int(delay_us)
        start_us = int(start_us)
        timeout_s = float(timeout_s)

        if target_count <= 0:
            raise ValueError("target_count must be at least 1")

        if target_count > 5:
            raise ValueError("For safety, target_count cannot exceed 5 in test mode")

        if delay_us < 7000:
            raise ValueError("delay_us too low. Use 7000 or higher")

        if timeout_s > 60:
            raise ValueError("timeout_s cannot exceed 60 seconds")

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
        previous_detected = initial_detected

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

                detected, raw = self.read_ir(ir_pin)

                # Count only CLEAR -> DETECT transition.
                if detected and not previous_detected:
                    count += 1
                    result["events"].append({
                        "count": count,
                        "target": target_count,
                        "elapsed_s": round(elapsed, 3),
                        "ir_raw": format(raw, "08b"),
                    })

                    time.sleep(lockout_s)

                previous_detected = detected

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

        finally:
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
                "status": "disabled",
                "reason": reason,
            }
            for k, reason in DISABLED_PATHS.items()
        },
        "drive_mode": "full-step two-phase",
        "safe_off": hex(SAFE_OFF),
        "logic": "HIGH=ON, LOW=OFF",
        "recommended_delay_us": 10000,
    }
