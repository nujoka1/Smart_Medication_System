#!/bin/bash

export DISPLAY=:0
export XAUTHORITY=/home/admin/.Xauthority

# Immediately hide desktop
xsetroot -display :0 -solid black 2>/dev/null || true

# Hide mouse cursor if available
unclutter -idle 0.1 -root 2>/dev/null &

# Wait for X display
for i in {1..20}; do
    if xdpyinfo -display :0 >/dev/null 2>&1; then
        break
    fi
    sleep 0.5
done

# Wait for API, but do not wait forever
for i in {1..30}; do
    if curl -fsS --max-time 1 http://127.0.0.1:8080/api/status >/dev/null 2>&1; then
        break
    fi
    sleep 0.5
done

pkill -f "medsystem-chromium" 2>/dev/null || true

exec /usr/bin/chromium \
  --no-sandbox \
  --disable-gpu \
  --disable-dev-shm-usage \
  --no-first-run \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --password-store=basic \
  --use-mock-keychain \
  --user-data-dir=/tmp/medsystem-chromium \
  --window-size=480,320 \
  --start-fullscreen \
  --kiosk \
  http://127.0.0.1:8080
