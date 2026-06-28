#!/usr/bin/env python3
import time
import smbus2

IR_ADDR = 0x23
bus = smbus2.SMBus(1)

# Six IR sensors connected to P0-P5
IR_PINS = [0, 1, 2, 3, 4, 5]

# Most IR obstacle sensors are active LOW:
# OUT = 0 means object detected
# OUT = 1 means clear
ACTIVE_LOW = True

def release_inputs():
    # PCF8574 inputs must be written HIGH first
    # This releases the pins so sensors can pull them LOW/HIGH.
    bus.write_byte(IR_ADDR, 0xFF)

def read_ir():
    release_inputs()
    time.sleep(0.02)
    return bus.read_byte(IR_ADDR)

try:
    print("Testing 6 IR sensors on expander 0x23")
    print("IR pins: P0, P1, P2, P3, P4, P5")
    print("Block each sensor one by one.")
    print("Stop with CTRL+C")
    print()

    while True:
        value = read_ir()

        print("RAW:", format(value, "08b"), "|", end=" ")

        for index, pin in enumerate(IR_PINS, start=1):
            bit = (value >> pin) & 1

            if ACTIVE_LOW:
                detected = (bit == 0)
            else:
                detected = (bit == 1)

            if detected:
                print(f"IR{index}:DETECT", end="  ")
            else:
                print(f"IR{index}:CLEAR ", end="  ")

        print()
        time.sleep(0.3)

except KeyboardInterrupt:
    release_inputs()
    print("\nStopped.")
