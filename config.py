"""
MedSystem Configuration
All GPIO pins, thresholds, and system settings in one place.
Change hardware wiring? Change it here — nowhere else.
"""

# ── GPIO PIN ASSIGNMENTS (BCM numbering) ─────────────────
class Pins:
    # Servo motor (dispensing)
    SERVO           = 18    # PWM-capable pin (kept for single-servo fallback)

    # 6 servo PWM pins — one per compartment
    SERVOS          = {
        0: 18,   # Comp 0 Morning  — Pin 12
        1: 12,   # Comp 1 Noon     — Pin 32
        2: 13,   # Comp 2 Evening  — Pin 33
        3: 19,   # Comp 3 Night    — Pin 35
        4: 6,    # Comp 4 Extra A  — Pin 31
        5: 26,   # Comp 5 Extra B  — Pin 37
    }

    # Limit switch (home position detection)
    LIMIT_SWITCH    = 17    # Active LOW, internal pull-up

    # LEDs
    LED_GREEN       = 16    # Dispense success
    LED_RED         = 23    # Alert / error
    LED_RING        = 24    # Camera illumination ring

    # Audio
    BUZZER          = 25    # Alert tone (if using GPIO buzzer)

    # HX711 Load Cell
    HX711_DOUT      = 20
    HX711_SCK       = 21

    # Power monitoring
    MAINS_SENSE     = 26    # HIGH = mains present
    BATTERY_LOW     = 19    # LOW = battery below threshold

    # IR sensors — one per compartment (Active LOW, internal pull-up)
    # Wired to GPIO pins below; pill breaks beam as it exits chute
    IR_SENSORS      = {
        0: 5,    # Compartment 0 — Morning
        1: 6,    # Compartment 1 — Noon
        2: 13,   # Compartment 2 — Evening
        3: 27,   # Compartment 3 — Night
        4: 22,   # Compartment 4 — Extra A
        5: 4,    # Compartment 5 — Extra B
    }

# ── SERVO CONFIGURATION ───────────────────────────────────
class ServoConfig:
    HOME_PULSE      = 500   # µs — home position (limit switch triggers here)
    COMPARTMENTS    = {
        0: 500,             # Compartment 0 — Morning   (0°)
        1: 833,             # Compartment 1 — Noon      (60°)
        2: 1166,            # Compartment 2 — Evening   (120°)
        3: 1500,            # Compartment 3 — Night     (180°)
        4: 1833,            # Compartment 4 — Extra A   (240°)
        5: 2166,            # Compartment 5 — Extra B   (300°)
    }
    MOVE_DELAY      = 0.8   # seconds to wait after each move
    HOME_TIMEOUT    = 5.0   # seconds before homing declared failed

# ── AI MODEL ─────────────────────────────────────────────
class AIConfig:
    MODEL_PATH      = "models/best.tflite"
    CONFIDENCE      = 0.5
    IOU_THRESHOLD   = 0.45
    IMG_SIZE        = 320
    DEVICE          = "cpu"

# ── LOAD CELL ─────────────────────────────────────────────
class LoadCellConfig:
    TARE_SAMPLES    = 10    # Samples to average for tare
    MEASURE_SAMPLES = 5     # Samples per measurement
    SCALE_FACTOR    = 1.0   # Calibrate this per physical setup
    MIN_WEIGHT_G    = 0.1   # Minimum detectable weight (grams)

# ── SCHEDULE ──────────────────────────────────────────────
class ScheduleConfig:
    CHECK_INTERVAL  = 30    # Seconds between schedule checks
    ALERT_ADVANCE   = 60    # Seconds before dose time to alert
    MISSED_WINDOW   = 1800  # Seconds after dose time = missed dose

# ── DATABASE ──────────────────────────────────────────────
class DBConfig:
    PATH            = "data/medsystem.db"
    ECHO            = False # Set True for SQL debug logging

# ── FLASK API ─────────────────────────────────────────────
class APIConfig:
    HOST            = "0.0.0.0"
    PORT            = 5000
    DEBUG           = False
    SECRET_KEY      = "medsystem-secret-change-in-production"

# ── LOGGING ───────────────────────────────────────────────
class LogConfig:
    LEVEL           = "INFO"
    FILE            = "logs/medsystem.log"
    MAX_BYTES       = 5 * 1024 * 1024   # 5MB
    BACKUP_COUNT    = 3
