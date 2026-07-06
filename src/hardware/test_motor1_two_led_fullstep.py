#!/usr/bin/env python3
import time
import argparse
import smbus2

parser = argparse.ArgumentParser()
parser.add_argument("--duration-s", type=float, default=60)
parser.add_argument("--delay-us", type=int, default=12000)
parser.add_argument("--start-us", type=int, default=35000)
parser.add_argument("--reverse", action="store_true")
args = parser.parse_args()

bus = smbus2.SMBus(1)

ADDR = 0x27
SAFE_OFF = 0x00

# Motor 1 confirmed wiring/order:
# IN1=P0, IN2=P1, IN3=P2, IN4=P4
# Correct working order: IN1, IN3, IN2, IN4
A = 0   # IN1
B = 2   # IN3
C = 1   # IN2
D = 4   # IN4

# FULL-STEP TWO-PHASE:
# Two LEDs/coils ON at the same time.
SEQ = [
    [A, B],   # IN1 + IN3
    [B, C],   # IN3 + IN2
    [C, D],   # IN2 + IN4
    [D, A],   # IN4 + IN1
]

if args.reverse:
    SEQ = list(reversed(SEQ))

def all_off():
    for addr in [0x27, 0x26, 0x25]:
        bus.write_byte(addr, SAFE_OFF)

def make_value(active_pins):
    value = SAFE_OFF
    for pin in active_pins:
        value |= (1 << pin)   # HIGH = ON
    return value

def delay_for_step(i):
    ramp_steps = 200
    run_delay = args.delay_us / 1_000_000.0
    start_delay = args.start_us / 1_000_000.0

    if i < ramp_steps:
        ratio = i / ramp_steps
        return start_delay - (start_delay - run_delay) * ratio

    return run_delay

try:
    print("=" * 70)
    print("MOTOR 1 TWO-LED FULL-STEP TEST")
    print("Two LEDs should blink together.")
    print("SAFE_OFF = 0x00")
    print("Sequence:")
    print("P0+P2 → P2+P1 → P1+P4 → P4+P0")
    print("=" * 70)

    all_off()
    time.sleep(1)

    print("Two-LED pair check...")
    for pair in SEQ:
        print(f"ON pair: {pair}")
        bus.write_byte(ADDR, make_value(pair))
        time.sleep(1)
        all_off()
        time.sleep(0.4)

    print("Rotating in two-phase full-step mode...")
    print("Press Ctrl+C to stop early.")

    start = time.monotonic()
    i = 0

    while time.monotonic() - start < args.duration_s:
        bus.write_byte(ADDR, make_value(SEQ[i % len(SEQ)]))
        time.sleep(delay_for_step(i))
        i += 1

    print("Done.")

except KeyboardInterrupt:
    print("\nStopped.")

finally:
    all_off()
    bus.close()
    print("All motors OFF.")
