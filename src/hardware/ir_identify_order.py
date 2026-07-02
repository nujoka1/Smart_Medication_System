#!/usr/bin/env python3
"""
IR physical order identifier.
Pass a pill through one sensor at a time.
The terminal prints which IR number detected it.
"""

import time
import smbus2

IR_ADDR = 0x23
BUZZER_PIN = 6
IR_INPUT_VALUE = 0xFF & ~(1 << BUZZER_PIN)
IR_PINS = [0, 1, 2, 3, 4, 5]

bus = smbus2.SMBus(1)

counts = [0, 0, 0, 0, 0, 0]
prev = [False, False, False, False, False, False]

print()
print("=" * 70)
print("IR SENSOR PHYSICAL ORDER IDENTIFIER")
print("=" * 70)
print("Pass a pill through ONE physical sensor at a time.")
print("Example: pass through leftmost sensor, then note what prints.")
print("Press Ctrl+C to stop.")
print("=" * 70)
print()

try:
    while True:
        bus.write_byte(IR_ADDR, IR_INPUT_VALUE)
        time.sleep(0.003)
        raw = bus.read_byte(IR_ADDR)

        for i, pin in enumerate(IR_PINS):
            bit = (raw >> pin) & 1
            detected = bit == 0

            if detected and not prev[i]:
                counts[i] += 1
                print(
                    f"DETECTED → IR{i+1} on P{pin} | "
                    f"Count={counts[i]} | RAW={raw:08b}"
                )

            prev[i] = detected

        time.sleep(0.05)

except KeyboardInterrupt:
    print()
    print("=" * 70)
    print("FINAL COUNTS")
    print("=" * 70)
    for i, c in enumerate(counts, start=1):
        print(f"IR{i}: {c}")
    print("=" * 70)

finally:
    bus.write_byte(IR_ADDR, IR_INPUT_VALUE)
    bus.close()
