#!/bin/bash

export DISPLAY=:0
export XAUTHORITY=/home/admin/.Xauthority
export HOME=/home/admin

xset s off 2>/dev/null || true
xset -dpms 2>/dev/null || true
xset s noblank 2>/dev/null || true
xsetroot -solid black 2>/dev/null || true
unclutter -idle 0.1 -root 2>/dev/null &

openbox --sm-disable 2>/dev/null &

# Wait for API
for i in {1..60}; do
    if curl -fsS --max-time 1 http://127.0.0.1:8080/api/status >/dev/null 2>&1; then
        break
    fi
    sleep 1
done

# Apply touch calibration
for i in {1..30}; do
    if xinput list | grep -q "ADS7846 Touchscreen"; then
        xinput set-prop "ADS7846 Touchscreen" "Evdev Axis Calibration" 350 3820 290 3820 2>/dev/null || true
        xinput set-prop "ADS7846 Touchscreen" "Evdev Axis Inversion" 1 0 2>/dev/null || true
        xinput set-prop "ADS7846 Touchscreen" "Evdev Axes Swap" 0 2>/dev/null || true
        xinput map-to-output "ADS7846 Touchscreen" default 2>/dev/null || true
        break
    fi
    sleep 1
done

PROFILE_DIR="/home/admin/.config/medsystem-chromium"
mkdir -p "$PROFILE_DIR"

while true; do
    rm -f "$PROFILE_DIR"/SingletonLock "$PROFILE_DIR"/SingletonSocket "$PROFILE_DIR"/SingletonCookie 2>/dev/null || true

    /usr/bin/chromium \
      --no-sandbox \
      --disable-gpu \
      --disable-dev-shm-usage \
      --no-first-run \
      --disable-infobars \
      --disable-session-crashed-bubble \
      --disable-features=TranslateUI \
      --disable-background-networking \
      --disable-sync \
      --disable-component-update \
      --password-store=basic \
      --use-mock-keychain \
      --user-data-dir="$PROFILE_DIR" \
      --window-size=480,320 \
      --start-fullscreen \
      --kiosk \
      http://127.0.0.1:8080/tft

    echo "Chromium exited. Restarting in 2 seconds..."
    sleep 2
done
