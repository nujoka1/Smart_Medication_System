/*
MedSystem TFT Schedule Manage
- Tap schedule item to open details
- Delete/disable schedule from TFT using DELETE /api/schedule/<id>
*/

let selectedScheduleItem = null;

(function initScheduleManage() {
    injectScheduleManageCSS();
    injectScheduleDetailScreen();

    // Override final schedule renderer with clickable rows
    window.renderSchedule = renderScheduleManage;

    setTimeout(() => {
        if (typeof patchScheduleButtons === "function") patchScheduleButtons();
        if (typeof attachScheduleDragEvents === "function") attachScheduleDragEvents();
    }, 1000);
})();

function injectScheduleManageCSS() {
    if (document.getElementById("tft-schedule-manage-css")) return;

    const style = document.createElement("style");
    style.id = "tft-schedule-manage-css";
    style.textContent = `
        .schedule-click-item {
            cursor: pointer;
            border: 1px solid #332552 !important;
        }

        .schedule-click-item:active {
            border-color: #00c853 !important;
            background: #13291f !important;
        }

        .detail-line {
            background: #100d20;
            border: 1px solid #332552;
            border-radius: 11px;
            padding: 7px 9px;
            margin-bottom: 6px;
        }

        .detail-label {
            font-size: 11px;
            color: #b9aecf;
            text-transform: uppercase;
        }

        .detail-value {
            font-size: 17px;
            font-weight: 900;
            color: #ffffff;
            margin-top: 2px;
        }

        .delete-warning {
            color: #ef4444;
            font-size: 12px;
            font-weight: 800;
            margin-top: 4px;
        }
    `;
    document.head.appendChild(style);
}

function injectScheduleDetailScreen() {
    if (document.getElementById("schedule-detail")) return;

    const wrap = document.createElement("div");
    wrap.innerHTML = `
        <div id="schedule-detail" class="screen">
            <div class="header">
                <div class="title">ALARM DETAILS</div>
                <div class="time"></div>
            </div>

            <div class="scroll-area" style="height:214px;">
                <div class="detail-line">
                    <div class="detail-label">Medication</div>
                    <div class="detail-value" id="detailMed">--</div>
                </div>

                <div class="detail-line">
                    <div class="detail-label">Time / Quantity</div>
                    <div class="detail-value" id="detailTimeQty">--</div>
                </div>

                <div class="detail-line">
                    <div class="detail-label">Compartment / Patient</div>
                    <div class="detail-value" id="detailCompPatient">--</div>
                </div>

                <div class="detail-line">
                    <div class="detail-label">Verification Mode</div>
                    <div class="detail-value" id="detailMode">--</div>
                    <div class="delete-warning">Delete only removes this alarm, not the medication stock.</div>
                </div>
            </div>

            <div class="bottom three compact-bottom">
                <button class="btn-dark" onclick="showScreen('schedule')">Back</button>
                <button class="btn-red" onclick="deleteSelectedSchedule()">Delete</button>
                <button class="btn-green" onclick="showScreen('home')">Home</button>
            </div>
        </div>
    `;

    document.body.appendChild(wrap);
}

function renderScheduleManage(schedule, meds) {
    const box = document.getElementById("scheduleList");
    if (!box) return;

    tftScheduleRows = schedule || [];

    if (!tftScheduleRows.length) {
        box.innerHTML = `
            <div class="item">
                <div class="schedule-item-main">No schedule today</div>
                <div class="schedule-item-sub">Add alarm from TFT or main dashboard</div>
            </div>
        `;
        if (typeof patchScheduleButtons === "function") patchScheduleButtons();
        if (typeof ensureScheduleIndicator === "function") ensureScheduleIndicator();
        if (typeof updateScheduleScrollIndicator === "function") updateScheduleScrollIndicator();
        return;
    }

    box.innerHTML = tftScheduleRows.map((s, index) => {
        const aiClass = s.ai_class || "custom";
        const modeText = aiClass !== "custom" ? "AI + camera + count" : "Count + camera only";
        const badge = typeof scheduleModeBadge === "function" ? scheduleModeBadge(aiClass) : "";

        return `
            <div class="item schedule-click-item" onclick="openScheduleDetail(${index})">
                <div class="schedule-item-main">
                    <span class="schedule-number">${index + 1}.</span>
                    <span class="schedule-time-green">${s.time || "--:--"}</span>
                    • ${s.med || "Medication"}
                    ${badge}
                </div>
                <div class="schedule-item-sub">
                    ${s.patient || "Patient"} • Qty ${s.qty || 1} • Comp ${s.compartment ?? "-"} • ${modeText}
                </div>
            </div>
        `;
    }).join("");

    if (typeof patchScheduleButtons === "function") patchScheduleButtons();
    if (typeof ensureScheduleIndicator === "function") ensureScheduleIndicator();
    if (typeof attachScheduleDragEvents === "function") attachScheduleDragEvents();
    if (typeof updateScheduleScrollIndicator === "function") setTimeout(updateScheduleScrollIndicator, 100);
}

function openScheduleDetail(index) {
    const item = tftScheduleRows[index];
    if (!item) return;

    selectedScheduleItem = item;

    const aiClass = item.ai_class || "custom";
    const mode = aiClass !== "custom"
        ? "AI + Camera + Pill Count"
        : "Count + Camera Only";

    document.getElementById("detailMed").textContent = item.med || "Medication";
    document.getElementById("detailTimeQty").textContent = `${item.time || "--:--"} • Qty ${item.qty || 1}`;
    document.getElementById("detailCompPatient").textContent =
        `Comp ${item.compartment ?? "-"} • ${item.patient || "Patient"}`;
    document.getElementById("detailMode").textContent = mode;

    showScreen("schedule-detail");
}

async function deleteSelectedSchedule() {
    if (!selectedScheduleItem || !selectedScheduleItem.id) {
        showMessage("No alarm selected.");
        return;
    }

    try {
        const res = await fetch(`/api/schedule/${selectedScheduleItem.id}`, {
            method: "DELETE"
        });

        const data = await res.json();

        if (!res.ok) {
            showMessage(data.error || "Could not delete alarm.");
            return;
        }

        selectedScheduleItem = null;
        await loadData();
        showMessage("Alarm deleted successfully.");

    } catch (e) {
        showMessage("API error while deleting alarm.");
    }
}
