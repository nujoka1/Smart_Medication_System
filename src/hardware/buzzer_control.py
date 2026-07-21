#!/usr/bin/env python3
"""
Direct Raspberry Pi GPIO buzzer control.

Working wiring:
Buzzer +  -> Raspberry Pi BCM GPIO21 / physical pin 40
Buzzer -  -> Raspberry Pi GND / physical pin 39

Logic:
GPIO HIGH = buzzer ON
GPIO LOW  = buzzer OFF
"""

import time
import RPi.GPIO as GPIO

BUZZER_GPIO = 21
ACTIVE_HIGH = True


def _setup(initial_off=True):
    GPIO.setwarnings(False)
    GPIO.setmode(GPIO.BCM)

    off_state = GPIO.LOW if ACTIVE_HIGH else GPIO.HIGH
    initial = off_state if initial_off else GPIO.LOW

    GPIO.setup(BUZZER_GPIO, GPIO.OUT, initial=initial)


def buzzer_on():
    _setup(initial_off=False)
    GPIO.output(BUZZER_GPIO, GPIO.HIGH if ACTIVE_HIGH else GPIO.LOW)


def buzzer_off():
    _setup(initial_off=False)
    GPIO.output(BUZZER_GPIO, GPIO.LOW if ACTIVE_HIGH else GPIO.HIGH)


def beep(seconds=0.5):
    buzzer_on()
    time.sleep(seconds)
    buzzer_off()


def alarm_pattern(duration_s=10, on_s=0.35, off_s=0.35):
    end_time = time.time() + duration_s

    try:
        while time.time() < end_time:
            buzzer_on()
            time.sleep(on_s)
            buzzer_off()
            time.sleep(off_s)
    finally:
        buzzer_off()


if __name__ == "__main__":
    print("Buzzer GPIO21 test: ON 2 seconds, then OFF")
    beep(2.0)
