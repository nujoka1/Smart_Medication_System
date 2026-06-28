#!/usr/bin/env python3
import time
import smbus2

bus = smbus2.SMBus(1)

# Stepper 4 is on expander 0x26
ADDR = 0x26

# Stepper 4 mapping
A = 5
B = 6
C = 7
D = 3   # IC pin 7 / P3, transistor boosted and inverted

# Safe OFF:
# Normal pins LOW = OFF
# Boosted P3 HIGH = OFF
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

def write(addr, value):
    bus.write_byte(addr, value & 0xFF)

def all_off():
    # Keep all stepper expanders safe
    write(0x27, SAFE_OFF)
    write(0x26, SAFE_OFF)
    write(0x25, SAFE_OFF)

def make_value(active_pins):
    value = SAFE_OFF

    for pin in [A, B, C, D]:
        active = pin in active_pins

        if pin == D:
            # Transistor boosted P3:
            # LOW = ON, HIGH = OFF
            if active:
                value &= ~(1 << pin)
            else:
                value |= (1 << pin)
        else:
            # Normal pins:
            # HIGH = ON, LOW = OFF
            if active:
                value |= (1 << pin)
            else:
                value &= ~(1 << pin)

    return value

try:
    print("Testing Stepper 4 only")
    print("Address 0x26: A=P5, B=P6, C=P7, D=P3 inverted")
    print("Stop with CTRL+C")

    all_off()
    time.sleep(1)

    while True:
        for step in sequence:
            value = make_value(step)
            write(ADDR, value)
            time.sleep(0.01)

except KeyboardInterrupt:
    all_off()
    print("\nStopped. Stepper 4 OFF.")
