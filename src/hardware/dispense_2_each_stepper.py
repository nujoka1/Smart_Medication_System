#!/usr/bin/env python3
import time
import smbus2

bus = smbus2.SMBus(1)

# ======================================================
# SMART PILL DISPENSER TEST
# Rotate each stepper until its matching IR sensor counts 2 pills
# ======================================================

# Stepper expanders
STEPPER_EXPANDERS = [0x27, 0x26, 0x25]

# IR expander
IR_ADDR = 0x23

# IR sensors: P0-P5
# Buzzer on P6 kept OFF
BUZZER_PIN = 6
IR_INPUT_VALUE = 0xFF & ~(1 << BUZZER_PIN)  # P6 LOW, others released HIGH

# Safe OFF for LCD-backpack stepper expanders:
# Normal pins OFF = LOW
# Boosted P3 OFF = HIGH
SAFE_OFF = 0b00001000

# Number of pills to count per motor
TARGET_PILLS = 2

# Safety timeout per stepper
MAX_RUN_SECONDS = 60

# Step delay. Increase if motor vibrates.
STEP_DELAY = 0.006

# Motor mapping:
# pins are [A, B, C, D]
# P3 for motors 2,4,6 is transistor-buffered and inverted
MOTORS = {
    1: {"addr": 0x27, "pins": [0, 1, 2, 4], "inverted": [],  "ir_pin": 0},
    2: {"addr": 0x27, "pins": [5, 6, 7, 3], "inverted": [3], "ir_pin": 1},

    3: {"addr": 0x26, "pins": [0, 1, 2, 4], "inverted": [],  "ir_pin": 2},
    4: {"addr": 0x26, "pins": [5, 6, 7, 3], "inverted": [3], "ir_pin": 3},

    5: {"addr": 0x25, "pins": [0, 1, 2, 4], "inverted": [],  "ir_pin": 4},
    6: {"addr": 0x25, "pins": [5, 6, 7, 3], "inverted": [3], "ir_pin": 5},
}

# Half-step sequence for 28BYJ-48:
# A, AB, B, BC, C, CD, D, DA
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

# Change this to True if direction is wrong
REVERSE_DIRECTION = False


def write_expander(addr, value):
    bus.write_byte(addr, value & 0xFF)


def all_steppers_off():
    for addr in STEPPER_EXPANDERS:
        write_expander(addr, SAFE_OFF)


def prepare_ir_inputs():
    # Release P0-P5 for IR input reading, keep P6 buzzer OFF
    write_expander(IR_ADDR, IR_INPUT_VALUE)


def read_ir_detected(ir_pin):
    prepare_ir_inputs()
    time.sleep(0.002)

    value = bus.read_byte(IR_ADDR)
    bit = (value >> ir_pin) & 1

    # IR obstacle sensors are active LOW:
    # 0 = detected
    # 1 = clear
    detected = (bit == 0)

    return detected, value


def build_motor_value(motor_num, active_coils):
    motor = MOTORS[motor_num]
    pins = motor["pins"]
    inverted_pins = motor["inverted"]

    value = SAFE_OFF

    for coil_index, pin in enumerate(pins):
        active = coil_index in active_coils

        if pin in inverted_pins:
            # Transistor-buffered P3:
            # LOW = ON
            # HIGH = OFF
            if active:
                value &= ~(1 << pin)
            else:
                value |= (1 << pin)
        else:
            # Normal LCD-backpack output:
            # HIGH = ON
            # LOW = OFF
            if active:
                value |= (1 << pin)
            else:
                value &= ~(1 << pin)

    return value


def step_motor_once(motor_num, sequence_index):
    motor = MOTORS[motor_num]
    addr = motor["addr"]

    seq = list(reversed(SEQUENCE)) if REVERSE_DIRECTION else SEQUENCE
    active_coils = seq[sequence_index % len(seq)]

    value = build_motor_value(motor_num, active_coils)
    write_expander(addr, value)


def dispense_from_motor(motor_num):
    motor = MOTORS[motor_num]
    ir_pin = motor["ir_pin"]

    count = 0
    previous_detected = False
    sequence_index = 0
    start_time = time.time()

    print()
    print(f"===== START STEPPER {motor_num} =====")
    print(f"Using IR{motor_num} on P{ir_pin}")
    print(f"Target pills: {TARGET_PILLS}")

    all_steppers_off()
    time.sleep(0.3)

    while count < TARGET_PILLS:
        elapsed = time.time() - start_time

        if elapsed > MAX_RUN_SECONDS:
            all_steppers_off()
            print(f"TIMEOUT on Stepper {motor_num}. Counted {count}/{TARGET_PILLS}.")
            print("Stopping test for safety.")
            return False

        # Rotate one half-step
        step_motor_once(motor_num, sequence_index)
        sequence_index += 1
        time.sleep(STEP_DELAY)

        # Read matching IR sensor
        detected, raw = read_ir_detected(ir_pin)

        # Count only CLEAR -> DETECT transition
        if detected and not previous_detected:
            count += 1
            print(f"Stepper {motor_num}: pill detected! Count = {count}/{TARGET_PILLS} | RAW {raw:08b}")

            # Small lockout so one pill is not counted many times
            time.sleep(0.20)

        previous_detected = detected

    all_steppers_off()
    print(f"Stepper {motor_num} complete. Counted {count} pills.")
    time.sleep(1)
    return True


def main():
    print("Smart Pill Dispenser Combined Stepper + IR Test")
    print("Each stepper will rotate until 2 pills are detected.")
    print("Stop anytime with CTRL+C.")
    print()

    all_steppers_off()
    prepare_ir_inputs()
    time.sleep(1)

    for motor_num in range(1, 7):
        ok = dispense_from_motor(motor_num)

        if not ok:
            print("Test stopped because one motor timed out.")
            break

    all_steppers_off()
    prepare_ir_inputs()
    print()
    print("Test finished. All steppers OFF.")


try:
    main()

except KeyboardInterrupt:
    all_steppers_off()
    prepare_ir_inputs()
    print("\nStopped by user. All steppers OFF.")
