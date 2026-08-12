# MedSystem User Guide

This guide covers the V2 MedSystem dashboard and Android companion app from the perspective of a patient, caregiver, or system operator.

## 1. Sign In

Open MedSystem and sign in with the credentials configured for the installation.

For the current development build:

```text
Username: admin
Password: 1234
```

Use **Keep me signed in** only on a trusted device.

## 2. Dashboard

The Dashboard provides the fastest view of the current medication state.

It shows:

- Active patient
- Next scheduled dose
- Adherence summary
- Low-stock attention items
- Current system status
- Today’s medication schedule
- Latest verification result

Use the patient switcher in the header to change the active patient.

## 3. Patients

The Patients screen is used to manage patient profiles.

Available actions include:

- Add patient
- View patient
- Edit patient
- Set as active patient
- Deactivate patient
- Delete patient

RFID identification is not required for the current workflow and remains a future feature.

## 4. Medication

The Medication screen manages medication records and stock.

Available actions include:

- Add medication
- Edit medication
- Update / refill stock
- Reset stock
- Archive related schedules
- Delete medication

When registering medication, assign the correct dispenser compartment and verification method.

## 5. Schedule

The Schedule screen controls when medication should be dispensed.

### Create a schedule

1. Select the patient.
2. Select the medication source:
   - **AI-supported medication** — choose from the trained medication list.
   - **Registered medication** — use a medication already stored in MedSystem.
   - **Medication not listed** — create a custom medication entry.
3. Set the dose time.
4. Set the number of pills to dispense.
5. Select the repeat pattern.
6. Save the schedule.

### Verification modes

**AI-supported medication**

Uses pill counting, camera evidence, and the configured AI medication class.

**Registered medication**

Uses the verification method already stored with that medication.

**Medication not listed**

Uses pill counting and camera evidence. AI classification is skipped.

## 6. How Automatic Dispensing Works

When a schedule becomes due:

1. MedSystem identifies the prescribed quantity.
2. The assigned stepper motor starts rotating.
3. The paired IR sensor counts pills as they pass.
4. The motor continues rotating until the requested number of pills has been detected.
5. The motor stops immediately when the target count is reached.
6. The camera captures evidence.
7. Verification and dose history are updated.
8. Medication stock is adjusted.
9. The patient is alerted that the medication is ready.

A safety timeout remains in place to prevent indefinite motor operation if pills do not reach the sensor.

## 7. Adherence

The Adherence screen summarizes recorded medication events for the selected patient.

Use it to review:

- Verified doses
- Missed doses
- Verification outcomes
- Historical dose activity

## 8. Evidence

The Evidence screen contains camera records associated with medication events.

Depending on the current build, available actions can include:

- View
- Flag for review
- Export
- Delete

Evidence is intended to provide an auditable record of the dispensing and verification event.

## 9. Caregiver

The Caregiver screen provides a simplified patient-care view for monitoring medication activity and attention items.

## 10. System Status

The customer-facing System screen is intentionally simplified. It focuses on useful operational information rather than development details.

Typical information includes:

- Connection status
- Medication service status
- Available dispensing compartments

## 11. Settings

Settings provide user-level controls such as:

- Alarm tone
- Alert volume
- Notification preferences
- Light / dark appearance

Engineering-only connection values should not normally be exposed to end users in the final product.

## 12. Low Stock

MedSystem tracks medication stock. Refill medication through the Medication screen before stock reaches the configured threshold.

## 13. If the App Shows Offline

Check that:

1. The MedSystem dispenser is powered on.
2. The device backend is running.
3. The phone or computer can reach the MedSystem network.
4. The API service is responding.

For development diagnostics, an engineer can test the backend status endpoint directly. These diagnostics are intentionally kept out of the normal customer interface.

## 14. Safety

MedSystem is currently an engineering prototype. Users should continue to follow medication labels, prescriptions, and professional medical advice. The system should not be used as the sole safety mechanism for medication administration without appropriate validation and regulatory controls.
