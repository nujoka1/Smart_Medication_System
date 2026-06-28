#!/usr/bin/env python3
import time
import RPi.GPIO as GPIO

BUZZER_PIN = 27   # BCM GPIO27 = physical pin 13

GPIO.setmode(GPIO.BCM)
GPIO.setup(BUZZER_PIN, GPIO.OUT)
GPIO.output(BUZZER_PIN, GPIO.LOW)

try:
    print("Testing buzzer on GPIO27 / physical pin 13")
    print("Stop with CTRL+C")

    while True:
        print("BUZZER ON")
        GPIO.output(BUZZER_PIN, GPIO.HIGH)
        time.sleep(0.5)

        print("BUZZER OFF")
        GPIO.output(BUZZER_PIN, GPIO.LOW)
        time.sleep(0.5)

except KeyboardInterrupt:
    GPIO.output(BUZZER_PIN, GPIO.LOW)
    GPIO.cleanup()
    print("\nStopped. Buzzer OFF.")
