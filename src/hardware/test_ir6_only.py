#!/usr/bin/env python3
import time
import smbus2

ADDR = 0x23
IR6_PIN = 5
BUZZER_PIN = 6

bus = smbus2.SMBus(1)

def read_ir6():
    # P0-P5 released as inputs, P6 buzzer OFF, P7 released
    value_out = 0xFF & ~(1 << BUZZER_PIN)
    bus.write_byte(ADDR, value_out)
    time.sleep(0.01)
    return bus.read_byte(ADDR)

print("Testing IR6 only on P5")
print("Pass object/pill through last IR sensor.")
print("Stop with CTRL+C")

try:
    while True:
        value = read_ir6()
        bit = (value >> IR6_PIN) & 1

        if bit == 0:
            status = "DETECT"
        else:
            status = "CLEAR"

        print(f"RAW {value:08b} | IR6/P5 = {status}")
        time.sleep(0.2)

except KeyboardInterrupt:
    bus.write_byte(ADDR, 0xFF & ~(1 << BUZZER_PIN))
    print("\nStopped.")
