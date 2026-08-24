# MedSystem

### Smart medication care with dispensing, verification and evidence built in.

MedSystem is more than a pill dispenser. It is a complete medication-care system that combines an automated dispenser, touchscreen control, a live web dashboard and an Android companion app in one product.

> **Live Dashboard:** https://pilldispenser.tail4c5d0a.ts.net/
>
> **Android App:** MedSystem for Android (`com.nujoka.medsystem`)

---

## See MedSystem in Action

MedSystem gives patients and caregivers one place to manage medication, schedules, dispensing, adherence and verification.

The same system is available through:

- **On-device TFT interface** for local use
- **Live browser dashboard** from anywhere
- **Android companion app** for mobile access

![MedSystem system architecture](docs/images/system-architecture.svg)

## Why MedSystem Is Different

Most medication reminders only tell the user that it is time to take medicine. MedSystem goes further: it physically dispenses the medication, counts the pills, captures evidence and records what happened.

### Key capabilities

- Automatic medication dispensing
- Patient profiles
- Medication registration and stock tracking
- Time-based medication scheduling
- Dose quantity control
- Continuous IR pill counting
- Immediate motor stop when the prescribed count is reached
- Camera evidence after dispensing
- AI-assisted verification for supported medications
- Custom-medication mode when a drug is not in the trained AI list
- Dose history and adherence tracking
- Low-stock warnings
- Caregiver monitoring
- Automatic scheduled dispensing
- Real-time clock synchronization using NTP + DS3231 RTC
- Responsive web dashboard
- Android companion app
- Local-first operation even when internet access is unavailable

## Product Experience

The goal of MedSystem is simple: medication management should feel clear, dependable and intentional.

The patient or caregiver can:

1. Sign in.
2. Select or create a patient.
3. Register a medication.
4. Choose an AI-supported, registered or custom medication.
5. Set time, quantity and repeat days.
6. Let MedSystem dispense automatically.
7. Review dose history and verification evidence afterward.

## Live Dashboard

The current live dashboard is available at:

**https://pilldispenser.tail4c5d0a.ts.net/**

The dashboard includes:

- Dashboard overview
- Patients
- Medication
- Schedule
- Adherence
- Evidence
- Caregiver
- System
- Settings

The interface includes live date/time, patient switching, dose status, stock information and verification records.

## Android Companion App

MedSystem also has a native Android application built from the same responsive React frontend using Capacitor.

**Application ID:**

```text
com.nujoka.medsystem
```

The Android app provides the same medication-care workflow in a mobile-first form, including patient management, medication setup, schedules, evidence and adherence.

Build output:

```text
v2/frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

Install on a connected Android phone:

```bash
adb install -r v2/frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

## Physical Product Concept

![MedSystem 2D product concept](docs/images/medsystem-2d-concept.svg)

The enclosure is designed around a front-facing touchscreen, medication storage/dispensing section, camera verification area and internal electronics compartment.

The repository will retain the actual prototype/3D mechanical renders alongside the engineering drawings as those assets are consolidated into `docs/images/`.

## How Dispensing Works

![MedSystem dispensing flow](docs/images/dispensing-flow.svg)

For a prescribed dose of `N` pills:

```text
Schedule becomes due
        ↓
Target pill count = N
        ↓
Stepper rotates continuously
        ↓
IR detects a pill
        ↓
Count increases
        ↓
IR clears and rearms
        ↓
Continue until count == N
        ↓
Motor stops immediately
        ↓
Camera evidence / verification
        ↓
Dose record + stock update
        ↓
Medication-ready alert
```

The timeout is a safety ceiling, not the normal stop condition. The normal stop condition is the actual pill count reaching the prescribed quantity.

## Current Hardware Configuration

The current prototype uses three active dispensing paths:

| Compartment | Motor | Pill sensor | Status |
|---|---:|---:|---|
| 1 | Motor 1 | IR 1 | Active |
| 3 | Motor 3 | IR 3 | Active |
| 5 | Motor 5 | IR 5 | Active |
| 2, 4, 6 | — | — | Planned for a later hardware revision |

The active controller uses stepper motors and paired IR sensors for closed-loop pill counting.

## Time Reliability

Medication schedules depend on accurate time, so MedSystem uses a layered clock strategy:

```text
Internet / NTP
      ↓
Raspberry Pi system time
      ↓
DS3231 RTC
```

When internet access is available, the Raspberry Pi synchronizes using NTP and updates the DS3231. When internet access is unavailable, the RTC preserves time for the device.

## Software Architecture

MedSystem uses a Raspberry Pi as the central controller.

- Flask API
- SQLite database
- Automatic dispense service
- Stepper/IR hardware control
- Camera evidence service
- AI-assisted medication verification
- React/Vite frontend
- Capacitor Android application

The detailed architecture is documented here:

- [Design & Architecture](docs/DESIGN_AND_ARCHITECTURE.md)
- [Documentation Index](docs/README.md)
- [User Guide](docs/USER_GUIDE.md)

## Repository Structure

```text
Smart_Medication_System/
├── src/
│   ├── ai/
│   ├── api/
│   ├── core/
│   ├── hardware/
│   └── services/
├── templates/
├── static/
├── models/
├── docs/
│   └── images/
├── v2/
│   └── frontend/
│       ├── src/
│       └── android/
├── run_api_8080.py
└── main.py
```

## Build the Web Dashboard

```bash
cd v2/frontend
npm install
npm run build
```

## Build the Android App

Requirements:

- Node.js / npm
- Android SDK
- JDK 21

```bash
cd v2/frontend
npm install
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

## Prototype Access

Development login currently used by the prototype interface:

```text
Username: admin
Password: 1234
```

This is prototype access control only. A public production deployment requires server-side authentication, secure credential storage, authorization roles, HTTPS and a formal security review.

## Status

MedSystem is currently an advanced engineering prototype. The integrated dispenser, TFT interface, browser dashboard and Android application are under active development and validation.

It should not yet be represented as a certified medical device or used as the sole medication-safety mechanism without the required engineering validation, clinical validation, cybersecurity controls and regulatory approval.

---

**MedSystem — medication care that does more than remind.**
