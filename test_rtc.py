import board
import busio
import adafruit_ds3231
from datetime import datetime

# Connect to DS3231
i2c = busio.I2C(board.SCL, board.SDA)
rtc = adafruit_ds3231.DS3231(i2c)

# Set current time (run this once to sync)
# Comment out after first run
now = datetime.now()
rtc.datetime = now.timetuple()
print(f"Time set to: {now.strftime('%Y-%m-%d %H:%M:%S')}")

# Read back time
t = rtc.datetime
print(f"RTC reads:   {t.tm_year}-{t.tm_mon:02d}-{t.tm_mday:02d} "
      f"{t.tm_hour:02d}:{t.tm_min:02d}:{t.tm_sec:02d}")

# Check temperature (DS3231 has built-in sensor)
print(f"RTC temp:    {rtc.temperature:.1f}°C")

# Verify time is ticking
import time
time.sleep(2)
t2 = rtc.datetime
print(f"2s later:    {t2.tm_hour:02d}:{t2.tm_min:02d}:{t2.tm_sec:02d}")
print("✓ RTC is running" if t2.tm_sec != t.tm_sec else "✗ RTC not ticking — check wiring")
