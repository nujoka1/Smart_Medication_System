#!/usr/bin/env python3
import time
import smbus2

IR_ADDR = 0x23
bus = smbus2.SMBus(1)

IR_PINS = [0, 1, 2, 3, 4, 5]

def read_value():
    bus.write_byte(IR_ADDR, 0xFF)
    time.sleep(0.01)
    return bus.read_byte(IR_ADDR)

print("IR change test on 0x23 P0-P5")
print("Do not pass any pill yet. Calibrating baseline for 3 seconds...")
time.sleep(3)

baseline = read_value()
previous = baseline
counts = [0, 0, 0, 0, 0, 0]

print(f"Baseline RAW: {baseline:08b}")
print("Now pass a pill. Count happens only when a sensor changes from baseline.")
print("Stop with CTRL+C")

try:
    while True:
        value = read_value()

        line = f"RAW {value:08b} | "

        for i, pin in enumerate(IR_PINS):
            base_bit = (baseline >> pin) & 1
            prev_bit = (previous >> pin) & 1
            now_bit = (value >> pin) & 1

            # Count only when the signal changes away from its baseline
            if now_bit != base_bit and prev_bit == base_bit:
                counts[i] += 1
                print(f"\nIR{i+1}: CHANGE DETECTED, count = {counts[i]}")

            status = "CHANGED" if now_bit != base_bit else "BASE"
            line += f"IR{i+1}:{status}({counts[i]})  "

        previous = value
        print(line, end="\r")
        time.sleep(0.05)

except KeyboardInterrupt:
    print("\nStopped.")
    print("Final counts:")
    for i, c in enumerate(counts, start=1):
        print(f"IR{i}: {c}")
