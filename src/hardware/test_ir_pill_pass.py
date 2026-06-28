#!/usr/bin/env python3
import time
import smbus2

IR_ADDR = 0x23
bus = smbus2.SMBus(1)

# Six IR sensors on P0-P5
IR_PINS = [0, 1, 2, 3, 4, 5]

# Most IR obstacle sensors:
# 0 = detected, 1 = clear
ACTIVE_LOW = True

pill_counts = [0, 0, 0, 0, 0, 0]
previous_detected = [False, False, False, False, False, False]

def release_inputs():
    # Release all PCF pins HIGH for input reading
    bus.write_byte(IR_ADDR, 0xFF)

def read_value():
    release_inputs()
    time.sleep(0.01)
    return bus.read_byte(IR_ADDR)

def is_detected(value, pin):
    bit = (value >> pin) & 1
    if ACTIVE_LOW:
        return bit == 0
    else:
        return bit == 1

print("Pill-pass IR test on 0x23 P0-P5")
print("A count increases only when a sensor changes CLEAR -> DETECT.")
print("Stop with CTRL+C")
print()

try:
    while True:
        value = read_value()

        line = f"RAW {value:08b} | "

        for i, pin in enumerate(IR_PINS):
            detected = is_detected(value, pin)

            # Count only rising detection event
            if detected and not previous_detected[i]:
                pill_counts[i] += 1
                print(f"\nIR{i+1}: PILL PASSED, count = {pill_counts[i]}")

            previous_detected[i] = detected

            if detected:
                line += f"IR{i+1}:DETECT({pill_counts[i]})  "
            else:
                line += f"IR{i+1}:CLEAR({pill_counts[i]})  "

        print(line, end="\r")
        time.sleep(0.05)

except KeyboardInterrupt:
    release_inputs()
    print("\nStopped.")
    print("Final counts:")
    for i, count in enumerate(pill_counts, start=1):
        print(f"IR{i}: {count}")
