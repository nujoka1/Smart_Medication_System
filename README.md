# MedSystem — Smart Medication Dispenser

MedSystem is a smart medication management platform that combines an automated pill dispenser, patient scheduling, pill counting, camera evidence, and AI-assisted medication verification in one system.

The project is designed around a Raspberry Pi-based dispenser with a touchscreen interface, a responsive web dashboard, and an Android companion app built from the same frontend codebase.

## What MedSystem Does

MedSystem helps a patient or caregiver manage medication by combining scheduling, dispensing, verification, evidence, and adherence tracking.

Core capabilities include:

- Patient profile management
- Medication registration and stock tracking
- Medication scheduling by time, quantity, and repeat days
- Automatic scheduled dispensing
- Continuous IR pill counting until the prescribed quantity is detected
- Camera evidence capture after dispensing
- AI-assisted medication verification for supported medication classes
- Custom medication mode for medicines outside the trained AI list
- Dose history and adherence tracking
- Low-stock warnings
- Caregiver-facing monitoring
- Responsive browser dashboard
- Android companion app via Capacitor
- Local-first operation with the dispenser remaining authoritative

## Current Hardware Configuration

The current production prototype uses three active dispensing paths:

| Compartment | Motor | Pill sensor | Status |
|---|---:|---:|---|
| 1 | Motor 1 | IR 1 | Active |
| 3 | Motor 3 | IR 3 | Active |
| 5 | Motor 5 | IR 5 | Active |
| 2, 4, 6 | — | — | Planned for a future hardware revision |

The active dispense controller rotates continuously and counts each pill only after a valid IR clear-to-detect transition. The motor stops immediately when the requested pill count is reached. A timeout remains only as a safety fallback.

## System Architecture

```text
                    ┌──────────────────────────────┐
                    │        MedSystem UI          │
                    │ Web Dashboard + Android App  │
                    └──────────────┬───────────────┘
                                   │ HTTP API
                                   ▼
                    ┌──────────────────────────────┐
                    │       MedSystem Backend      │
                    │ Flask API + SQLite + Logic   │
                    └──────────────┬───────────────┘
                                   │
             ┌─────────────────────┼──────────────────────┐
             ▼                     ▼                      ▼
      ┌─────────────┐      ┌──────────────┐      ┌──────────────┐
      │ Dispensing  │      │ Verification │      │ Scheduling   │
      │ Steppers+IR │      │ Camera + AI  │      │ Auto Service │
      └─────────────┘      └──────────────┘      └──────────────┘
```

## Repository Structure

```text
Smart_Medication_System/
├── src/
│   ├── ai/                  # Medication detection / verification
│   ├── api/                 # Flask API routes
│   ├── core/                # Database layer
│   ├── hardware/            # Stepper, IR, camera and buzzer control
│   └── services/            # Automatic scheduled dispensing
├── templates/               # Raspberry Pi TFT/browser templates
├── static/                  # TFT JavaScript modules
├── models/                  # AI model assets
├── v2/
│   └── frontend/            # React + Vite + Capacitor frontend
├── docs/                    # User and technical documentation
├── run_api_8080.py          # API launcher
└── main.py                  # Legacy/system entry point
```

## V2 Dashboard and Android App

The V2 frontend is built with:

- React 19
- Vite 7
- Lucide icons
- Capacitor 7

The same codebase is used for both the browser dashboard and Android app.

### Main screens

- Login
- Dashboard
- Patients
- Medication
- Schedule
- Adherence
- Evidence
- Caregiver
- System
- Settings

### Medication setup flow

The schedule workflow follows the dispenser TFT design:

1. Select patient
2. Choose medication source:
   - AI-supported medication
   - Registered medication
   - Medication not listed
3. Configure time
4. Configure quantity
5. Configure repeat days
6. Save schedule

AI-supported medicines use the configured AI class list. Custom medicines continue to use pill counting and camera evidence without AI classification.

## Quick Start — Frontend

```bash
cd v2/frontend
npm install
npm run build
```

Run locally for development:

```bash
npm run dev -- --host 0.0.0.0
```

## Android Build

### Requirements

- Node.js / npm
- Android SDK
- JDK 21

Build the frontend first:

```bash
cd v2/frontend
npm install
npm run build
```

If the Android platform has not yet been generated:

```bash
npx cap add android
```

Synchronize the web bundle:

```bash
npx cap sync android
```

Build the APK:

```bash
cd android
./gradlew assembleDebug
```

APK output:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Install on a connected Android device:

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

The Android application ID is:

```text
com.nujoka.medsystem
```

## Raspberry Pi API

The device backend is launched through:

```bash
python3 run_api_8080.py
```

The API serves medication, patient, schedule, evidence, status, hardware, AI-class, and automatic-dispense endpoints.

For production deployment, run the backend and frontend through managed services rather than interactive terminal sessions.

## Automatic Dispensing Logic

For a scheduled quantity of `N` pills:

```text
Schedule becomes due
        ↓
Target pill count = N
        ↓
Stepper rotates continuously
        ↓
IR detects a pill
        ↓
Count increases by 1
        ↓
IR clears and rearms
        ↓
Continue until count == N
        ↓
Stepper stops immediately
        ↓
Camera evidence / verification
        ↓
Dose record + stock update
        ↓
Medication-ready alert
```

## Login

The current V2 interface includes a local application login for development and prototype use.

Development credentials:

```text
Username: admin
Password: 1234
```

These credentials must not be treated as production authentication. A deployment intended for public or clinical use should use server-side authentication, secure credential storage, authorization roles, HTTPS, audit controls, and a formal security review.

## Documentation

- [User Guide](docs/USER_GUIDE.md)
- [V2 Frontend Notes](v2/README.md)

## Android APK from GitHub Actions

The repository includes a GitHub Actions workflow that builds the Android debug APK automatically. Open the latest successful **Android APK** workflow run and download the `MedSystem-Android-Debug` artifact.

## Important Status Note

MedSystem is currently an engineering prototype and academic/research system. It should not be represented as a certified medical device or used as the sole mechanism for medication safety without the appropriate verification, validation, regulatory, reliability, cybersecurity, and clinical controls.

## Project

**MedSystem — Smart Medication Dispenser**

Repository: `nujoka1/Smart_Medication_System`
