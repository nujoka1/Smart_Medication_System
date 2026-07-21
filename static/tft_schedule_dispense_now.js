/*
TFT Scheduled Dispense Now Integration

Connects:
- Due screen Ready/Dispense button
- Schedule detail page
to:
POST /api/schedule/<schedule_id>/dispense-now
*/

let scheduleDispenseBusy = false;
let tftSelectedScheduleForDispense = null;

(function initScheduleDispenseNow() {
    injectScheduleDispenseCSS();
    // Due screen is now automatic-status only.
    // Manual dispense remains available only from schedule detail for engineering tests.
    patchScheduleDetailOpen();
    setInterval(ensureScheduleDispenseControls, 3000);
})();

function injectScheduleDispenseCSS() {
    if (document.getElementById("schedule-dispense-now-css")) return;

    const style = document.createElement("style");
    style.id = "schedule-dispense-now-css";
    style.textContent = `
        .schedule-dispense-card {
            background:#100d20;
            border:1px solid var(--line);
            border-radius:14px;
            padding:10px;
            margin:8px 0;
        }

        .schedule-dispense-title {
            font-size:17px;
            font-weight:900;
            color:#ffffff;
        }

        .schedule-dispense-sub {
            font-size:11px;
            color:var(--muted);
            margin-top:3px;
            line-height:1.25;
        }

        .schedule-dispense-status {
            min-height:54px;
            max-height:92px;
            overflow-y:auto;
            background:#06040f;
            border:1px solid var(--line);
            border-radius:12px;
            padding:8px;
            font-size:12px;
            color:#ffffff;
            margin-top:8px;
            line-height:1.25;
        }

        .schedule-dispense-actions {
            display:grid;
            grid-template-columns:1fr;
            gap:8px;
            margin-top:8px;
        }

        .schedule-dispense-actions button {
            height:48px;
            border-radius:13px;
            font-size:15px;
            font-weight:900;
        }
    `;
    document.head.appendChild(style);
}

function patchDueReadyButton() {
    // Deprecated: due-time dispense must be automatic, not button-triggered.
    // Kept as a no-op for compatibility.
}

function patchScheduleDetailOpen() {
    if (window.openScheduleDetail && !window.openScheduleDetail.__dispensePatched) {
        const originalOpenScheduleDetail = window.openScheduleDetail;

        window.openScheduleDetail = function(index) {
            try {
                if (window.tftScheduleRows && window.tftScheduleRows[index]) {
                    tftSelectedScheduleForDispense = window.tftScheduleRows[index];
                }
            } catch (e) {}

            const result = originalOpenScheduleDetail.apply(this, arguments);

            setTimeout(function () {
                ensureScheduleDispenseControls();
                updateScheduleDispenseDetailText();
            }, 150);

            return result;
        };

        window.openScheduleDetail.__dispensePatched = true;
    }
}

function getCurrentDoseSafe() {
    try {
        if (typeof currentDose !== "undefined" && currentDose) {
            return currentDose;
        }
    } catch (e) {}

    return null;
}

function ensureScheduleDispenseControls() {
    const screen = document.getElementById("schedule-detail");
    if (!screen) return;

    if (document.getElementById("scheduleDispenseBox")) return;

    const bottom = screen.querySelector(".bottom");

    const box = document.createElement("div");
    box.id = "scheduleDispenseBox";
    box.className = "schedule-dispense-card";
    box.innerHTML = `
        <div class="schedule-dispense-title">Scheduled Dispense</div>
        <div class="schedule-dispense-sub" id="scheduleDispenseInfo">
            Select a schedule item to dispense now.
        </div>
        <div class="schedule-dispense-actions">
            <button class="btn-green" onclick="dispenseSelectedScheduleNow()">Dispense Now</button>
        </div>
        <div class="schedule-dispense-status" id="scheduleDispenseStatus">
            Ready.
        </div>
    `;

    if (bottom) {
        screen.insertBefore(box, bottom);
    } else {
        screen.appendChild(box);
    }
}

function updateScheduleDispenseDetailText() {
    const info = document.getElementById("scheduleDispenseInfo");
    if (!info) return;

    const item = tftSelectedScheduleForDispense;

    if (!item) {
        info.textContent = "No schedule selected.";
        return;
    }

    info.textContent =
        `${item.time || "--:--"} • ${item.med || "Medication"} • ` +
        `Qty ${item.qty || 1} • Comp ${item.compartment ?? "-"}`;
}

function setScheduleDispenseStatus(msg) {
    const box = document.getElementById("scheduleDispenseStatus");
    if (box) box.textContent = msg;
}

async function callScheduleDispenseNow(scheduleItem, sourceLabel) {
    if (scheduleDispenseBusy) {
        if (sourceLabel === "detail") {
            setScheduleDispenseStatus("Dispense already running...");
        } else {
            showMessage("Dispense already running...");
        }
        return;
    }

    if (!scheduleItem || !scheduleItem.id) {
        if (sourceLabel === "detail") {
            setScheduleDispenseStatus("No schedule ID found.");
        } else {
            showMessage("No scheduled dose selected.");
        }
        return;
    }

    scheduleDispenseBusy = true;

    const medName = scheduleItem.med || "Medication";
    const doseQty = scheduleItem.qty || 1;

    if (sourceLabel === "detail") {
        setScheduleDispenseStatus(`Dispensing ${medName}, Qty ${doseQty}...`);
    } else {
        document.getElementById("pillProgress").textContent = `0 / ${doseQty}`;
        showScreen("dispensing");
    }

    try {
        const res = await fetch(`/api/schedule/${scheduleItem.id}/dispense-now`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                capture_on_failure: true,
                delay_us: 10000,
                timeout_s: 30
            })
        });

        const data = await res.json();

        const medication = data.medication || {};
        const evidence = data.evidence || {};
        const evidenceId = evidence.evidence_id || "-";
        const decision = data.decision || evidence.decision || "UNKNOWN";
        const outcome = data.outcome || "unknown";
        const countText = `${data.actual_count ?? 0}/${data.target_count ?? doseQty}`;
        const motorText = data.motor ? `M${data.motor}` : "Motor -";

        let displayOutcome = outcome.toUpperCase();
        let resultSub = "Medication dispense result recorded.";

        if (outcome === "missed" && decision === "COUNT_ERROR") {
            displayOutcome = "COUNT CHECK FAILED";
            resultSub = "Evidence saved. Review IR sensor/tape before final use.";
        } else if (data.dispense_success) {
            displayOutcome = "DISPENSE COMPLETE";
            resultSub = "Medication dispensed and evidence saved.";
        } else if (decision === "CAMERA_ERROR") {
            displayOutcome = "CAMERA ERROR";
            resultSub = "Dispense attempted, but evidence capture failed.";
        }

        const summary =
            `${displayOutcome} | ${medication.name || medName}\n` +
            `${motorText} | Count ${countText}\n` +
            `Decision: ${decision}\n` +
            `Evidence: ${evidenceId}`;

        if (sourceLabel === "detail") {
            setScheduleDispenseStatus(summary);
        } else {
            document.getElementById("pillProgress").textContent = countText;
            showMessage(summary, resultSub);
        }

        if (typeof loadData === "function") {
            await loadData();
        }

    } catch (e) {
        if (sourceLabel === "detail") {
            setScheduleDispenseStatus("ERROR: Scheduled dispense API not reachable.");
        } else {
            showMessage("ERROR: Scheduled dispense API not reachable.");
        }
    } finally {
        scheduleDispenseBusy = false;
    }
}

function dispenseSelectedScheduleNow() {
    updateScheduleDispenseDetailText();
    callScheduleDispenseNow(tftSelectedScheduleForDispense, "detail");
}

function dispenseCurrentDueDose() {
    const dose = getCurrentDoseSafe();
    callScheduleDispenseNow(dose, "due");
}

window.dispenseSelectedScheduleNow = dispenseSelectedScheduleNow;
window.dispenseCurrentDueDose = dispenseCurrentDueDose;
