#!/usr/bin/env python3
import time
import smbus2

bus = smbus2.SMBus(1)

ADDR = 0x27

# Stepper 1 = P0, P1, P2, P4
A = 0
B = 1
C = 2
D = 4

SAFE_OFF = 0b00001000

# Half-step sequence: A, AB, B, BC, C, CD, D, DA
sequence = [
    [A],
    [A, B],
    [B],
    [B, C],
    [C],
    [C, D],
    [D],
    [D, A],
]

def write(value):
    bus.write_byte(ADDR, value & 0xFF)

def all_off():
    write(SAFE_OFF)

def make_value(active_pins):
    value = SAFE_OFF

    for pin in [A, B, C, D]:
        if pin in active_pins:
            value |= (1 << pin)     # normal pin ON = HIGH
        else:
            value &= ~(1 << pin)    # normal pin OFF = LOW

    return value

try:
    print("Testing Stepper 1 only on 0x27")
    print("Watch ULN2003 LEDs A-B-C-D")
    print("Stop with CTRL+C")

    while True:
        for step in sequence:
            value = make_value(step)
            write(value)
            time.sleep(0.01)

except KeyboardInterrupt:
    all_off()
    print("\nStopped. Stepper 1 OFF.")
