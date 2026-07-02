#!/usr/bin/env python3
"""
Live terminal test for all six IR sensors on PCF8574 0x23.

IR1 = P0
IR2 = P1
IR3 = P2
IR4 = P3
IR5 = P4
IR6 = P5

Most IR obstacle sensors are active LOW:
1 = CLEAR
0 = DETECT
"""

import time
import smbus2
import os
import argparse

IR_ADDR = 0x23
BUZZER_PIN = 6

# Release P0-P5 as inputs HIGH, keep P6 buzzer OFF LOW, release P7 HIGH.
IR_INPUT_VALUE = 0xFF & ~(1 << BUZZER_PIN)

IR_PINS = [0, 1, 2, 3, 4, 5]


def read_ir(bus):
    bus.write_byte(IR_ADDR, IR_INPUT_VALUE)
    time.sleep(0.003)
    raw = bus.read_byte(IR_ADDR)

    states = []
    for idx, pin in enumerate(IR_PINS, start=1):
        bit = (raw >> pin) & 1

        # active LOW
        detected = bit == 0

        states.append({
            "id": idx,
            "pin": pin,
            "bit": bit,
            "detected": detected,
            "state": "DETECT" if detected else "CLEAR"
        })

    return raw, states


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--interval", type=float, default=0.15)
    parser.add_argument("--no-clear", action="store_true")
    args = parser.parse_args()

    bus = smbus2.SMBus(1)

    counts = [0, 0, 0, 0, 0, 0]
    prev = [False, False, False, False, False, False]
    last_raw = None

    print("\nLIVE IR SENSOR TEST")
    print("=" * 70)
    print("Pass a pill/object through each sensor.")
    print("Press Ctrl+C to stop.")
    print("=" * 70)
    time.sleep(1)

    try:
        while True:
            raw, states = read_ir(bus)

            if not args.no_clear:
                os.system("clear")

            print("LIVE IR SENSOR TEST")
            print("=" * 70)
            print(f"PCF8574 address : 0x23")
            print(f"RAW             : {raw:08b}")
            print(f"Changed raw     : {'YES' if raw != last_raw else 'NO'}")
            print("=" * 70)
            print("Sensor   Pin   Bit   State     Count")
            print("-" * 70)

            for i, s in enumerate(states):
                detected = s["detected"]

                # Count only CLEAR -> DETECT transition
                if detected and not prev[i]:
                    counts[i] += 1

                prev[i] = detected

                marker = "<<<" if detected else ""

                print(
                    f"IR{s['id']:<6} P{s['pin']:<4} {s['bit']:<5} "
                    f"{s['state']:<9} {counts[i]:<5} {marker}"
                )

            print("-" * 70)
            print("Expected idle state: all CLEAR when nothing blocks the sensors.")
            print("When a pill passes: the matching sensor should show DETECT and count increases.")
            print("If one sensor stays DETECT, adjust its blue potentiometer or check alignment.")

            last_raw = raw
            time.sleep(args.interval)

    except KeyboardInterrupt:
        print("\nStopped.")

    finally:
        bus.write_byte(IR_ADDR, IR_INPUT_VALUE)
        bus.close()


if __name__ == "__main__":
    main()
