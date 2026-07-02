#!/usr/bin/env python3
"""
Manual Dispense + Evidence Capture Test

Flow:
Selected motor rotates
IR sensor counts pills
Motor stops when target count is reached
Camera + LED evidence capture runs through API
Evidence metadata and annotated image are saved
"""

import argparse
import json
import time
import urllib.request
import urllib.error
import smbus2


# =========================
# I2C ADDRESSES
# =========================

STEPPER_EXPANDERS = [0x27, 0x26, 0x25]
IR_ADDR = 0x23

# P6 reserved for buzzer/future alarm line.
# Keep P6 LOW while reading IR sensors.
BUZZER_PIN = 6
IR_INPUT_VALUE = 0xFF & ~(1 << BUZZER_PIN)

# Safe OFF state:
# Normal stepper pins OFF = LOW
# P3 transistor/inverted line OFF = HIGH
SAFE_OFF = 0b00001000

STEP_DELAY = 0.006
MAX_RUN_SECONDS = 60
PILL_LOCKOUT_SECONDS = 0.20

# Set True if mechanical direction is wrong
REVERSE_DIRECTION = False


# =========================
# MOTOR MAPPING
# =========================
# pins = [A, B, C, D]
# P3 on motors 2, 4, and 6 is transistor-buffered/inverted.

MOTORS = {
    1: {"addr": 0x27, "pins": [0, 1, 2, 4], "inverted": [],  "ir_pin": 0, "compartment": 1},
    2: {"addr": 0x27, "pins": [5, 6, 7, 3], "inverted": [3], "ir_pin": 1, "compartment": 2},

    3: {"addr": 0x26, "pins": [0, 1, 2, 4], "inverted": [],  "ir_pin": 2, "compartment": 3},
    4: {"addr": 0x26, "pins": [5, 6, 7, 3], "inverted": [3], "ir_pin": 3, "compartment": 4},

    5: {"addr": 0x25, "pins": [0, 1, 2, 4], "inverted": [],  "ir_pin": 4, "compartment": 5},
    6: {"addr": 0x25, "pins": [5, 6, 7, 3], "inverted": [3], "ir_pin": 5, "compartment": 6},
}

# 28BYJ-48 half-step sequence
SEQUENCE = [
    [0],
    [0, 1],
    [1],
    [1, 2],
    [2],
    [2, 3],
    [3],
    [3, 0],
]


def all_steppers_off(bus):
    for addr in STEPPER_EXPANDERS:
        bus.write_byte(addr, SAFE_OFF)


def prepare_ir_inputs(bus):
    bus.write_byte(IR_ADDR, IR_INPUT_VALUE)


def read_ir(bus, ir_pin):
    prepare_ir_inputs(bus)
    time.sleep(0.002)

    raw = bus.read_byte(IR_ADDR)
    bit = (raw >> ir_pin) & 1

    # IR sensors are active LOW:
    # 0 = DETECT
    # 1 = CLEAR
    detected = bit == 0

    return detected, raw


def build_motor_value(motor_num, active_coils):
    motor = MOTORS[motor_num]
    pins = motor["pins"]
    inverted_pins = motor["inverted"]

    value = SAFE_OFF

    for coil_index, pin in enumerate(pins):
        active = coil_index in active_coils

        if pin in inverted_pins:
            # Inverted/transistor P3:
            # LOW = ON
            # HIGH = OFF
            if active:
                value &= ~(1 << pin)
            else:
                value |= (1 << pin)
        else:
            # Normal pins:
            # HIGH = ON
            # LOW = OFF
            if active:
                value |= (1 << pin)
            else:
                value &= ~(1 << pin)

    return value


def step_motor(bus, motor_num, step_index):
    motor = MOTORS[motor_num]
    addr = motor["addr"]

    sequence = list(reversed(SEQUENCE)) if REVERSE_DIRECTION else SEQUENCE
    active_coils = sequence[step_index % len(sequence)]

    value = build_motor_value(motor_num, active_coils)
    bus.write_byte(addr, value)


def dose_period_from_time(dose_time):
    try:
        hour = int(str(dose_time).split(":")[0])
    except Exception:
        return "Scheduled dose"

    if 5 <= hour < 12:
        return "Morning dose"
    if 12 <= hour < 17:
        return "Afternoon dose"
    if 17 <= hour < 22:
        return "Evening dose"
    return "Night dose"


def call_evidence_api(payload):
    url = "http://127.0.0.1:8080/api/evidence/capture"
    data = json.dumps(payload).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=25) as res:
            return json.loads(res.read().decode("utf-8"))

    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            return json.loads(body)
        except Exception:
            return {"success": False, "error": body}

    except Exception as e:
        return {"success": False, "error": str(e)}


def dispense_until_count(bus, motor_num, target_count):
    if motor_num not in MOTORS:
        raise ValueError("Motor must be between 1 and 6")

    motor = MOTORS[motor_num]
    ir_pin = motor["ir_pin"]

    count = 0
    previous_detected = False
    step_index = 0
    start_time = time.time()

    print()
    print("=" * 70)
    print("MANUAL DISPENSE TEST")
    print("=" * 70)
    print(f"Motor        : {motor_num}")
    print(f"Stepper addr : {hex(motor['addr'])}")
    print(f"IR sensor    : IR{motor_num} / P{ir_pin}")
    print(f"Target count : {target_count}")
    print("=" * 70)

    all_steppers_off(bus)
    prepare_ir_inputs(bus)
    time.sleep(0.3)

    idle_detected, idle_raw = read_ir(bus, ir_pin)
    print(f"Initial IR RAW: {idle_raw:08b}")

    if idle_detected:
        print()
        print("WARNING: Matching IR sensor is already DETECT before motor starts.")
        print("Remove obstruction or recalibrate the IR sensor.")
        print("The test will continue, but false counting is possible.")
        print()

    while count < target_count:
        elapsed = time.time() - start_time

        if elapsed > MAX_RUN_SECONDS:
            all_steppers_off(bus)
            prepare_ir_inputs(bus)

            print()
            print(f"TIMEOUT: counted {count}/{target_count}")
            return {
                "success": False,
                "count": count,
                "reason": "TIMEOUT"
            }

        step_motor(bus, motor_num, step_index)
        step_index += 1
        time.sleep(STEP_DELAY)

        detected, raw = read_ir(bus, ir_pin)

        # Count only CLEAR -> DETECT transition
        if detected and not previous_detected:
            count += 1
            print(f"Detected pill {count}/{target_count} | IR RAW {raw:08b}")

            time.sleep(PILL_LOCKOUT_SECONDS)

        previous_detected = detected

    all_steppers_off(bus)
    prepare_ir_inputs(bus)

    print()
    print(f"Dispense complete: counted {count}/{target_count}")

    return {
        "success": True,
        "count": count,
        "reason": "COUNT_REACHED"
    }


def main():
    parser = argparse.ArgumentParser(description="Manual dispense with IR count and evidence capture")

    parser.add_argument("--motor", type=int, required=True, help="Motor number 1-6")
    parser.add_argument("--qty", type=int, required=True, help="Number of pills to count")
    parser.add_argument("--name", type=str, required=True, help="Medication display name")
    parser.add_argument("--ai", type=str, default="custom", help="Expected AI class or custom")
    parser.add_argument("--time", type=str, default="08:00", help="Dose time HH:MM")
    parser.add_argument("--patient-id", type=int, default=None)
    parser.add_argument("--schedule-id", type=int, default=None)
    parser.add_argument("--medication-id", type=int, default=None)

    args = parser.parse_args()

    bus = smbus2.SMBus(1)

    try:
        result = dispense_until_count(bus, args.motor, args.qty)

        motor = MOTORS[args.motor]

        verification_mode = "count_camera_only" if args.ai == "custom" else "ai_camera_count"

        payload = {
            "expected_name": args.name,
            "expected_ai_class": args.ai,
            "verification_mode": verification_mode,
            "dose_time": args.time,
            "dose_period": dose_period_from_time(args.time),
            "dose_quantity": args.qty,
            "compartment": motor["compartment"],
            "patient_id": args.patient_id,
            "schedule_id": args.schedule_id,
            "medication_id": args.medication_id,
            "ir_target_count": args.qty,
            "ir_actual_count": result["count"]
        }

        print()
        print("Calling evidence capture API...")
        evidence = call_evidence_api(payload)

        print()
        print("=" * 70)
        print("FINAL RESULT")
        print("=" * 70)
        print(json.dumps(evidence, indent=2))
        print("=" * 70)

        if evidence.get("success"):
            print()
            print("Open annotated image:")
            print("http://127.0.0.1:8080" + evidence.get("annotated_url", ""))

            print()
            print("Open raw image:")
            print("http://127.0.0.1:8080" + evidence.get("raw_url", ""))

    except KeyboardInterrupt:
        print()
        print("Stopped by user.")

    finally:
        all_steppers_off(bus)
        prepare_ir_inputs(bus)
        bus.close()
        print()
        print("All motors OFF.")


if __name__ == "__main__":
    main()
