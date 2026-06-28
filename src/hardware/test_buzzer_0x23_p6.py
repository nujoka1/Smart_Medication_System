#!/usr/bin/env python3
import time
import smbus2

ADDR = 0x23
BUZZER_PIN = 6

bus = smbus2.SMBus(1)

def write(value):
    bus.write_byte(ADDR, value & 0xFF)

try:
    print("Testing buzzer on expander 0x23 P6")
    print("Stop with CTRL+C")

    while True:
        # P6 HIGH, others HIGH/released
        write(0xFF)
        print("BUZZER ON")
        time.sleep(1)

        # P6 LOW, others HIGH/released
        value = 0xFF & ~(1 << BUZZER_PIN)
        write(value)
        print("BUZZER OFF")
        time.sleep(1)

except KeyboardInterrupt:
    value = 0xFF & ~(1 << BUZZER_PIN)
    write(value)
    print("\nStopped. Buzzer OFF.")
