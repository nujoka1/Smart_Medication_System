#!/usr/bin/env python3
import json
import time
import urllib.request
import urllib.error
import sys
from pathlib import Path
from datetime import datetime

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from src.hardware.buzzer_control import buzzer_on, buzzer_off

API_BASE = "http://127.0.0.1:8080"

STATUS_PATH = Path("data/autodispense_status.json")
DONE_PATH = Path("data/autodispense_done.json")
ACK_PATH = Path("data/autodispense_ack.json")
LOG_PATH = Path("logs/autodispense.log")

POLL_SECONDS = 5
BUZZ_ON_SECONDS = 0.35
BUZZ_OFF_SECONDS = 0.35


def log(msg):
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    line = f"{datetime.now().isoformat()} | {msg}"
    print(line, flush=True)
    with LOG_PATH.open("a") as f:
        f.write(line + "\n")


def read_json(path, default):
    try:
        if path.exists():
            return json.loads(path.read_text())
    except Exception:
        pass
    return default


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2))


def api_get(path, timeout=20):
    with urllib.request.urlopen(API_BASE + path, timeout=timeout) as res:
        return json.loads(res.read().decode("utf-8"))


def api_post(path, payload, timeout=180):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        API_BASE + path,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
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


def today_key():
    return datetime.now().strftime("%Y-%m-%d")


def now_hhmm():
    return datetime.now().strftime("%H:%M")


def schedule_sort_key(item):
    try:
        comp = int(item.get("compartment"))
    except Exception:
        comp = 999
    return (comp, item.get("id", 999999))


def mark_status(data):
    base = {
        "success": True,
        "updated_at": datetime.now().isoformat(),
    }
    base.update(data)
    write_json(STATUS_PATH, base)


def get_due_batch(schedule, current_time):
    due = []
    for item in schedule:
        if item.get("time") == current_time and item.get("id"):
            due.append(item)
    due.sort(key=schedule_sort_key)
    return due


def is_batch_done(done, date_key, current_time, due_batch):
    for item in due_batch:
        sid = str(item.get("id"))
        key = f"{date_key}|{current_time}|{sid}"
        if not done.get(key):
            return False
    return True


def mark_batch_done(done, date_key, current_time, due_batch):
    for item in due_batch:
        sid = str(item.get("id"))
        key = f"{date_key}|{current_time}|{sid}"
        done[key] = {
            "done": True,
            "done_at": datetime.now().isoformat(),
            "med": item.get("med"),
            "compartment": item.get("compartment")
        }
    write_json(DONE_PATH, done)


def acknowledge_if_requested():
    if not ACK_PATH.exists():
        return False

    try:
        ACK_PATH.unlink()
    except Exception:
        pass

    try:
        buzzer_off()
    except Exception:
        pass

    status = read_json(STATUS_PATH, {})
    status["state"] = "acknowledged"
    status["alarm_active"] = False
    status["message"] = "Medication alarm acknowledged."
    status["acknowledged_at"] = datetime.now().isoformat()
    mark_status(status)

    log("Alarm acknowledged.")
    return True


def alarm_loop_until_ack():
    log("Starting buzzer alarm until acknowledgement.")

    while True:
        if acknowledge_if_requested():
            return

        status = read_json(STATUS_PATH, {})
        if not status.get("alarm_active"):
            try:
                buzzer_off()
            except Exception:
                pass
            return

        try:
            buzzer_on()
            time.sleep(BUZZ_ON_SECONDS)
            buzzer_off()
            time.sleep(BUZZ_OFF_SECONDS)
        except Exception as e:
            log(f"Buzzer error: {e}")
            time.sleep(1)


def process_due_batch(due_batch, current_time):
    results = []
    total = len(due_batch)

    for index, item in enumerate(due_batch, start=1):
        sid = item.get("id")
        med = item.get("med") or "Medication"
        patient = item.get("patient") or "Patient"

        mark_status({
            "state": "dispensing",
            "alarm_active": False,
            "message": f"Dispensing {index}/{total}: {med}",
            "due_time": current_time,
            "current_index": index,
            "total": total,
            "current_medication": med,
            "patient": patient,
            "schedule_id": sid,
            "batch": due_batch,
            "results": results,
        })

        log(f"Dispensing schedule {sid}: {med}")

        result = api_post(
            f"/api/schedule/{sid}/dispense-now",
            {
                "capture_on_failure": True,
                "delay_us": 10000,
                "timeout_s": 30
            },
            timeout=180
        )

        results.append(result)
        time.sleep(1)

    mark_status({
        "state": "ready",
        "alarm_active": True,
        "message": "Medication ready. Please take your medication.",
        "due_time": current_time,
        "total": total,
        "batch": due_batch,
        "results": results,
        "ready_at": datetime.now().isoformat()
    })

    log(f"Batch complete for {current_time}. Alarm active.")
    alarm_loop_until_ack()


def main():
    log("Auto-dispense service started.")
    buzzer_off()

    mark_status({
        "state": "idle",
        "alarm_active": False,
        "message": "Auto-dispense service running."
    })

    while True:
        try:
            if acknowledge_if_requested():
                time.sleep(1)

            current_time = now_hhmm()
            date_key = today_key()

            schedule = api_get("/api/schedule/today", timeout=20)
            done = read_json(DONE_PATH, {})

            due_batch = get_due_batch(schedule, current_time)

            if due_batch and not is_batch_done(done, date_key, current_time, due_batch):
                log(f"Due batch found at {current_time}: {len(due_batch)} item(s).")
                process_due_batch(due_batch, current_time)

                done = read_json(DONE_PATH, {})
                mark_batch_done(done, date_key, current_time, due_batch)

            else:
                mark_status({
                    "state": "idle",
                    "alarm_active": False,
                    "message": "Waiting for next scheduled dose.",
                    "time": current_time,
                    "schedule_count": len(schedule) if isinstance(schedule, list) else 0
                })

            time.sleep(POLL_SECONDS)

        except Exception as e:
            log(f"Main loop error: {e}")
            mark_status({
                "state": "error",
                "alarm_active": False,
                "message": str(e)
            })
            try:
                buzzer_off()
            except Exception:
                pass
            time.sleep(5)


if __name__ == "__main__":
    main()
