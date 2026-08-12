# MedSystem V2 Frontend

MedSystem V2 is the responsive user interface for the Smart Medication Dispenser. The same React/Vite codebase powers the browser dashboard and the Android companion application through Capacitor.

## Main Areas

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

## Medication Scheduling

The schedule workflow mirrors the main dispenser TFT experience instead of exposing database-oriented fields directly.

A user chooses:

1. Patient
2. Medication source
   - AI-supported medication
   - Registered medication
   - Medication not listed
3. Dose time
4. Quantity
5. Repeat days
6. Save

For custom medication, AI classification is skipped while pill counting and camera evidence remain available.

## Development

```bash
cd v2/frontend
npm install
npm run dev
```

Build the production web bundle:

```bash
npm run build
```

The production output is generated in:

```text
dist/
```

## Android

Requirements:

- Node.js
- Android SDK
- JDK 21

Generate the Android platform once:

```bash
npx cap add android
```

Sync the latest web build:

```bash
npm run build
npx cap sync android
```

Build the debug APK:

```bash
cd android
./gradlew assembleDebug
```

APK output:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Application ID:

```text
com.nujoka.medsystem
```

## GitHub APK Build

The repository includes `.github/workflows/android-build.yml`. The workflow builds the frontend, generates the Capacitor Android project, compiles the debug APK with Java 21, and uploads the resulting APK as a GitHub Actions artifact named:

```text
MedSystem-Android-Debug
```

## Backend

The V2 frontend currently communicates with the existing MedSystem device API. The backend remains authoritative for patients, medication, schedules, evidence, automatic dispensing, hardware state, and verification results.

Engineering connection details belong in deployment/configuration workflows rather than the normal customer-facing interface.

## Production Direction

The current login is a prototype access gate. A production deployment should move authentication and authorization to the backend, use HTTPS, implement secure credential storage and role-based permissions, and undergo a full security review.
