#!/usr/bin/env python3
import time
import argparse
import smbus2

parser = argparse.ArgumentParser()
parser.add_argument("--motor", type=int, required=True, choices=[1, 2, 3, 4, 5, 6])
parser.add_argument("--duration-s", type=float, default=30)
parser.add_argument("--delay-us", type=int, default=10000)
parser.add_argument("--start-us", type=int, default=35000)
parser.add_argument("--reverse", action="store_true")
args = parser.parse_args()

bus = smbus2.SMBus(1)

SAFE_OFF = 0x00

# Confirmed for odd motors:
# IN1, IN3, IN2, IN4
# Motor 1: 0x27 P0,P2,P1,P4
# Motor 3: 0x26 P0,P2,P1,P4
# Motor 5: 0x25 P0,P2,P1,P4
#
# Even motors still need P3 isolation later.
MOTORS = {
    1: {"addr": 0x27, "pins": [0, 2, 1, 4]},
    2: {"addr": 0x27, "pins": [5, 7, 6, 3]},
    3: {"addr": 0x26, "pins": [0, 2, 1, 4]},
    4: {"addr": 0x26, "pins": [5, 7, 6, 3]},
    5: {"addr": 0x25, "pins": [0, 2, 1, 4]},
    6: {"addr": 0x25, "pins": [5, 7, 6, 3]},
}

motor = MOTORS[args.motor]
ADDR = motor["addr"]
A, B, C, D = motor["pins"]

SEQ = [
    [A, B],
    [B, C],
    [C, D],
    [D, A],
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
    print(f"STEPPER ONLY TEST: MOTOR {args.motor}")
    print(f"Address: {hex(ADDR)}")
    print(f"Pins/order: {motor['pins']}")
    print("Drive: full-step two-phase")
    print("Two LEDs should blink together.")
    print(f"Delay: {args.delay_us} us")
    print("=" * 70)

    all_off()
    time.sleep(1)

    print("Pair check:")
    for pair in SEQ:
        print("ON pair:", pair)
        bus.write_byte(ADDR, make_value(pair))
        time.sleep(1)
        all_off()
        time.sleep(0.4)

    print("Rotating...")
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
