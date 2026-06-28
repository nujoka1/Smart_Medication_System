#!/usr/bin/env python3
import time
import smbus2

ADDR = 0x23
bus = smbus2.SMBus(1)

print("Identify IR pins on expander 0x23")
print("Block one sensor at a time and watch which P-number changes.")
print("Stop with CTRL+C")

try:
    while True:
        bus.write_byte(ADDR, 0xFF)
        time.sleep(0.01)
        value = bus.read_byte(ADDR)

        print("RAW:", format(value, "08b"), "|", end=" ")

        for pin in range(8):
            bit = (value >> pin) & 1
            if bit == 0:
                print(f"P{pin}:DETECT", end="  ")
            else:
                print(f"P{pin}:CLEAR ", end="  ")

        print()
        time.sleep(0.3)

except KeyboardInterrupt:
    bus.write_byte(ADDR, 0xFF)
    print("\nStopped.")
