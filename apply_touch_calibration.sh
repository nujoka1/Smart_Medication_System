#!/bin/bash

export DISPLAY=:0
export XAUTHORITY=/home/admin/.Xauthority

# Wait until X can see the touchscreen
for i in {1..30}; do
    if xinput list | grep -q "ADS7846 Touchscreen"; then
        break
    fi
    sleep 1
done

# Apply working ADS7846 calibration
xinput set-prop "ADS7846 Touchscreen" "Evdev Axis Calibration" 350 3820 290 3820
xinput set-prop "ADS7846 Touchscreen" "Evdev Axis Inversion" 1 0
xinput set-prop "ADS7846 Touchscreen" "Evdev Axes Swap" 0
xinput map-to-output "ADS7846 Touchscreen" default

echo "ADS7846 touchscreen calibration applied"
