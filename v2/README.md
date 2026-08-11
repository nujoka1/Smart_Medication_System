# MedSystem V2

Production-oriented responsive web/mobile frontend for the Smart Medication Dispenser.

## Scope
- Reuses the current Raspberry Pi API on port 8080 during migration.
- Does not modify the existing TFT or dispenser control stack.
- Hardware Revision 1 exposes dispensing channels 1, 3 and 5.
- RFID patient identification is presented as **Coming Soon — Hardware Revision 2**.

## Run on Raspberry Pi

```bash
cd ~/Smart_Medication_System/v2/frontend
npm install
npm run build
npm run dev -- --host 0.0.0.0 --port 5177
```

Open `http://<pi-address>:5177`.

## Architecture
- One responsive frontend for browser and future Capacitor Android build.
- Feature areas: Dashboard, Medications, Schedule, Adherence, Evidence, Caregiver, Device, Settings.
- Current backend remains authoritative while `/api/v2` endpoints are introduced incrementally.
