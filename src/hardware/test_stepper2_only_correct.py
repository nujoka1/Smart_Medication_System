#!/usr/bin/env python3
import time
import smbus2

bus = smbus2.SMBus(1)

ADDR = 0x27

# Stepper 2 on LCD backpack expander
# A = P5
# B = P6
# C = P7
# D = P3 through 2N2222 transistor
# D is inverted: P3 LOW = ON, P3 HIGH = OFF

A = 5
B = 6
C = 7
D = 3

SAFE_OFF = 0b00001000   # P3 HIGH, all other pins LOW

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
        active = pin in active_pins

        if pin == D:
            # boosted transistor pin:
            # LOW = ON, HIGH = OFF
            if active:
                value &= ~(1 << pin)
            else:
                value |= (1 << pin)
        else:
            # normal LCD backpack pins:
            # HIGH = ON, LOW = OFF
            if active:
                value |= (1 << pin)
            else:
                value &= ~(1 << pin)

    return value

try:
    print("Testing Stepper 2 only")
    print("Stepper 2 = P5, P6, P7, P3 inverted")
    print("Stop with CTRL+C")

    all_off()
    time.sleep(1)

    while True:
        for step in sequence:
            value = make_value(step)
            write(value)
            time.sleep(0.01)

except KeyboardInterrupt:
    all_off()
    print("\nStopped. Stepper 2 OFF.")
