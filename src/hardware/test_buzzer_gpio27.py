#!/usr/bin/env python3
import time
from gpiozero import Buzzer

# BCM GPIO27 = physical pin 13
buzzer = Buzzer(27)

try:
    print("Testing buzzer on GPIO27 / physical pin 13")
    print("Stop with CTRL+C")

    while True:
        print("BUZZER ON")
        buzzer.on()
        time.sleep(0.5)

        print("BUZZER OFF")
        buzzer.off()
        time.sleep(0.5)

except KeyboardInterrupt:
    buzzer.off()
    print("\nStopped. Buzzer OFF.")
