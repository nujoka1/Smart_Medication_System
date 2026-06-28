#!/usr/bin/env python3
import time
import smbus2

IR_ADDR = 0x23
BUZZER_PIN = 6

# IR sensors connected to P0-P5
IR_PINS = [0, 1, 2, 3, 4, 5]

# Most IR obstacle sensors are active LOW:
# 0 = detected
# 1 = clear
ACTIVE_LOW = True

bus = smbus2.SMBus(1)

counts = [0, 0, 0, 0, 0, 0]
previous_detected = [False, False, False, False, False, False]

def prepare_inputs():
    # P0-P5 HIGH = released for IR inputs
    # P6 LOW = buzzer OFF
    # P7 HIGH = unused/released
    value = 0xFF & ~(1 << BUZZER_PIN)
    bus.write_byte(IR_ADDR, value)

def read_expander():
    prepare_inputs()
    time.sleep(0.01)
    return bus.read_byte(IR_ADDR)

def is_detected(value, pin):
    bit = (value >> pin) & 1

    if ACTIVE_LOW:
        return bit == 0
    else:
        return bit == 1

print("Testing all 6 IR sensors on expander 0x23")
print("IR1-IR6 = P0-P5")
print("Buzzer P6 kept OFF")
print("Pass pill/object through each sensor.")
print("Stop with CTRL+C")
print()

try:
    while True:
        value = read_expander()

        line = f"RAW {value:08b} | "

        for i, pin in enumerate(IR_PINS):
            detected = is_detected(value, pin)

            # Count only when sensor changes from clear to detected
            if detected and not previous_detected[i]:
                counts[i] += 1
                print(f"\nIR{i+1}: PILL/OBJECT PASSED | count = {counts[i]}")

            previous_detected[i] = detected

            if detected:
                line += f"IR{i+1}:DETECT({counts[i]})  "
            else:
                line += f"IR{i+1}:CLEAR({counts[i]})  "

        print(line, end="\r")
        time.sleep(0.05)

except KeyboardInterrupt:
    prepare_inputs()
    print("\n\nFinal counts:")
    for i, count in enumerate(counts, start=1):
        print(f"IR{i}: {count}")
    print("Stopped. Buzzer kept OFF.")
