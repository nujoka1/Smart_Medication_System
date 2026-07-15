#!/usr/bin/env python3
import argparse
import json
import urllib.request
import urllib.error

API_BASE = "http://127.0.0.1:8080"

ENABLED_MOTORS = {
    1: {"ir": 1, "compartment": 1},
    3: {"ir": 3, "compartment": 3},
    5: {"ir": 5, "compartment": 5},
}

def post_json(path, payload, timeout=120):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        API_BASE + path,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            return json.loads(res.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        try:
            return json.loads(body)
        except Exception:
            return {"success": False, "error": body}
    except Exception as e:
        return {"success": False, "error": str(e)}

def main():
    parser = argparse.ArgumentParser(description="3-motor dispense + evidence test")
    parser.add_argument("--motor", type=int, required=True, choices=[1, 3, 5])
    parser.add_argument("--qty", type=int, default=1)
    parser.add_argument("--name", default="Test Medication")
    parser.add_argument("--ai", default="custom")
    parser.add_argument("--time", default="Manual")
    parser.add_argument("--period", default="Manual test")
    parser.add_argument("--delay-us", type=int, default=10000)
    parser.add_argument("--timeout-s", type=float, default=30)
    parser.add_argument("--reverse", action="store_true")
    args = parser.parse_args()

    path = ENABLED_MOTORS[args.motor]

    print("=" * 70)
    print("3-MOTOR DISPENSE + EVIDENCE TEST")
    print("=" * 70)
    print(f"Motor       : {args.motor}")
    print(f"IR sensor   : IR{path['ir']}")
    print(f"Compartment : {path['compartment']}")
    print(f"Qty target  : {args.qty}")
    print(f"Medication  : {args.name}")
    print(f"AI class    : {args.ai}")
    print("=" * 70)

    dispense_payload = {
        "motor": args.motor,
        "target_count": args.qty,
        "delay_us": args.delay_us,
        "timeout_s": args.timeout_s,
        "reverse": args.reverse,
    }

    print("\nRunning dispense-test...")
    dispense_result = post_json("/api/hardware/dispense-test", dispense_payload, timeout=140)
    print(json.dumps(dispense_result, indent=2))

    actual_count = int(dispense_result.get("actual_count") or 0)

    print("\nCalling evidence capture API...")
    evidence_payload = {
        "expected_name": args.name,
        "expected_ai_class": args.ai,
        "verification_mode": "count_camera_only" if args.ai == "custom" else "ai_camera_count",
        "dose_time": args.time,
        "dose_period": args.period,
        "dose_quantity": args.qty,
        "compartment": path["compartment"],
        "ir_target_count": args.qty,
        "ir_actual_count": actual_count,
    }

    evidence_result = post_json("/api/evidence/capture", evidence_payload, timeout=140)
    print(json.dumps(evidence_result, indent=2))

    print("\n" + "=" * 70)
    print("FINAL SUMMARY")
    print("=" * 70)
    print("Dispense success :", dispense_result.get("success"))
    print("Dispense reason  :", dispense_result.get("reason"))
    print("IR count         :", actual_count, "/", args.qty)
    print("Evidence success :", evidence_result.get("success"))
    print("Decision         :", evidence_result.get("decision"))
    print("Annotated image  :", evidence_result.get("annotated_url"))
    print("Raw image        :", evidence_result.get("raw_url"))
    print("=" * 70)

if __name__ == "__main__":
    main()
