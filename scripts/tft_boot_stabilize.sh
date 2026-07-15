#!/bin/bash

LOG="/home/admin/pilldispenser/logs/tft_boot_stabilize.log"
mkdir -p /home/admin/pilldispenser/logs

echo "========================================" >> "$LOG"
echo "Balanced TFT stabilize started: $(date)" >> "$LOG"

# Short delay only. Enough for tty/framebuffer to settle.
sleep 7

# Clear Chromium kiosk cache/profile quickly.
rm -rf /tmp/medsystem-chromium
rm -rf /home/admin/.config/medsystem-chromium

echo "Chromium profile cleared" >> "$LOG"
echo "Balanced TFT stabilize finished: $(date)" >> "$LOG"

exit 0
