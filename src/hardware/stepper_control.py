#!/usr/bin/env python3
"""
Stepper control module for Smart Medication Dispenser.

Confirmed working motors:
Motor 1 -> 0x27, P0, P2, P1, P4
Motor 3 -> 0x26, P0, P2, P1, P4
Motor 5 -> 0x25, P0, P2, P1, P4

Drive mode:
Full-step two-phase.
Two coils ON at once.

Confirmed:
SAFE_OFF = 0x00
HIGH = ON
LOW = OFF
"""

import time
import smbus2

STEPPER_ADDRS = [0x27, 0x26, 0x25]
SAFE_OFF = 0x00

SUPPORTED_MOTORS = {
    1: {"addr": 0x27, "pins": [0, 2, 1, 4], "name": "Motor 1"},
    3: {"addr": 0x26, "pins": [0, 2, 1, 4], "name": "Motor 3"},
    5: {"addr": 0x25, "pins": [0, 2, 1, 4], "name": "Motor 5"},
}

DISABLED_MOTORS = {
    2: "Disabled until P3 wiring is isolated",
    4: "Disabled until P3 wiring is isolated",
    6: "Disabled until P3 wiring is isolated",
}


class StepperController:
    def __init__(self, bus_id=1):
        self.bus = smbus2.SMBus(bus_id)

    def all_off(self):
        for addr in STEPPER_ADDRS:
            self.bus.write_byte(addr, SAFE_OFF)

    def make_value(self, active_pins):
        value = SAFE_OFF
        for pin in active_pins:
            value |= (1 << pin)
        return value

    def get_sequence(self, motor, reverse=False):
        if motor not in SUPPORTED_MOTORS:
            raise ValueError(f"Motor {motor} is not enabled. Only motors 1, 3, and 5 are enabled.")

        pins = SUPPORTED_MOTORS[motor]["pins"]
        a, b, c, d = pins

        sequence = [
            [a, b],
            [b, c],
            [c, d],
            [d, a],
        ]

        if reverse:
            sequence = list(reversed(sequence))

        return sequence

    def rotate_for_duration(self, motor, duration_s=3.0, delay_us=10000, start_us=35000, reverse=False):
        if motor not in SUPPORTED_MOTORS:
            raise ValueError(f"Motor {motor} is disabled or not configured.")

        duration_s = float(duration_s)
        delay_us = int(delay_us)
        start_us = int(start_us)

        if duration_s <= 0:
            raise ValueError("duration_s must be greater than 0")

        if duration_s > 10:
            raise ValueError("For safety, stepper test duration cannot exceed 10 seconds from API/TFT.")

        if delay_us < 7000:
            raise ValueError("delay_us too low. Use 7000 or higher for safe testing.")

        motor_cfg = SUPPORTED_MOTORS[motor]
        addr = motor_cfg["addr"]
        sequence = self.get_sequence(motor, reverse=reverse)

        self.all_off()
        time.sleep(0.2)

        start_time = time.monotonic()
        i = 0
        ramp_steps = 200

        while time.monotonic() - start_time < duration_s:
            active = sequence[i % len(sequence)]
            value = self.make_value(active)
            self.bus.write_byte(addr, value)

            if i < ramp_steps:
                ratio = i / ramp_steps
                current_delay = start_us - ((start_us - delay_us) * ratio)
            else:
                current_delay = delay_us

            time.sleep(current_delay / 1_000_000.0)
            i += 1

        self.all_off()

        return {
            "success": True,
            "motor": motor,
            "name": motor_cfg["name"],
            "addr": hex(addr),
            "pins": motor_cfg["pins"],
            "drive_mode": "full-step two-phase",
            "safe_off": hex(SAFE_OFF),
            "logic": "HIGH=ON, LOW=OFF",
            "duration_s": duration_s,
            "delay_us": delay_us,
            "reverse": reverse,
            "steps_executed": i,
        }

    def close(self):
        try:
            self.all_off()
        finally:
            self.bus.close()


def list_steppers():
    return {
        "supported": {
            str(k): {
                "name": v["name"],
                "addr": hex(v["addr"]),
                "pins": v["pins"],
                "status": "enabled",
            }
            for k, v in SUPPORTED_MOTORS.items()
        },
        "disabled": {
            str(k): {
                "status": "disabled",
                "reason": reason,
            }
            for k, reason in DISABLED_MOTORS.items()
        },
        "drive_mode": "full-step two-phase",
        "safe_off": hex(SAFE_OFF),
        "logic": "HIGH=ON, LOW=OFF",
        "recommended_delay_us": 10000,
    }
