/*
MedSystem TFT Scroll Update
Makes Today Schedule, Stock, and History pages scrollable and shows all entries.
*/

(function initTFTScrollUpdate() {
    injectScrollCSS();

    // Override existing render functions after the main TFT script has loaded.
    window.renderSchedule = renderScheduleScrollable;
    window.renderStock = renderStockScrollable;
    window.renderLogs = renderLogsScrollable;
})();

function injectScrollCSS() {
    if (document.getElementById("tft-scroll-update-css")) return;

    const style = document.createElement("style");
    style.id = "tft-scroll-update-css";
    style.textContent = `
        #scheduleList,
        #stockList,
        #logList {
            height: 206px !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            padding-right: 8px !important;
            touch-action: pan-y !important;
        }

        #scheduleList::-webkit-scrollbar,
        #stockList::-webkit-scrollbar,
        #logList::-webkit-scrollbar {
            width: 20px;
        }

        #scheduleList::-webkit-scrollbar-track,
        #stockList::-webkit-scrollbar-track,
        #logList::-webkit-scrollbar-track {
            background: #100d20;
            border-radius: 20px;
        }

        #scheduleList::-webkit-scrollbar-thumb,
        #stockList::-webkit-scrollbar-thumb,
        #logList::-webkit-scrollbar-thumb {
            background: linear-gradient(#a855f7, #00c853);
            border-radius: 20px;
            border: 3px solid #100d20;
        }

        .schedule-time {
            color: #18e179;
            font-weight: 900;
        }

        .schedule-med {
            color: #ffffff;
            font-weight: 900;
        }

        .mode-pill {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 999px;
            font-size: 10px;
            font-weight: 900;
            margin-left: 4px;
        }

        .mode-ai {
            background: rgba(168, 85, 247, 0.18);
            color: #c084fc;
            border: 1px solid rgba(168, 85, 247, 0.45);
        }

        .mode-custom {
            background: rgba(0, 200, 83, 0.16);
            color: #18e179;
            border: 1px solid rgba(0, 200, 83, 0.45);
        }

        .item {
            min-height: 54px !important;
            margin-bottom: 7px !important;
        }

        .item-main {
            font-size: 15px !important;
            line-height: 1.18 !important;
        }

        .item-sub {
            font-size: 11px !important;
            line-height: 1.25 !important;
        }
    `;
    document.head.appendChild(style);
}

function modeBadge(aiClass) {
    if (aiClass && aiClass !== "custom") {
        return '<span class="mode-pill mode-ai">AI</span>';
    }
    return '<span class="mode-pill mode-custom">COUNT</span>';
}

function renderScheduleScrollable(schedule, meds) {
    const box = document.getElementById('scheduleList');
    if (!box) return;

    if (!schedule || schedule.length === 0) {
        box.innerHTML = `
            <div class="item">
                <div class="item-main">No schedule today</div>
                <div class="item-sub">Add alarm from TFT or main dashboard</div>
            </div>
        `;
        return;
    }

    box.innerHTML = schedule.map(s => {
        const aiClass = s.ai_class || "custom";
        const modeText = aiClass !== "custom" ? "AI + camera + count" : "Count + camera only";

        return `
            <div class="item">
                <div class="item-main">
                    <span class="schedule-time">${s.time || '--:--'}</span>
                    •
                    <span class="schedule-med">${s.med || 'Medication'}</span>
                    ${modeBadge(aiClass)}
                </div>
                <div class="item-sub">
                    ${s.patient || 'Patient'} • Qty ${s.qty || 1} • Comp ${s.compartment ?? '-'} • ${modeText}
                </div>
            </div>
        `;
    }).join('');
}

function renderStockScrollable(meds) {
    const box = document.getElementById('stockList');
    if (!box) return;

    if (!meds || meds.length === 0) {
        box.innerHTML = `
            <div class="item">
                <div class="item-main">No medication saved</div>
                <div class="item-sub">Add medication from TFT or main dashboard</div>
            </div>
        `;
        return;
    }

    box.innerHTML = meds.map(m => {
        const aiClass = m.ai_class || "custom";
        const modeText = aiClass !== "custom" ? "AI supported" : "Custom / count only";

        return `
            <div class="item">
                <div class="item-main">
                    ${m.name || 'Medication'} ${statusBadge(m.stock)}
                </div>
                <div class="item-sub">
                    Stock: ${m.stock ?? '--'} • Comp: ${m.compartment ?? '-'} • ${modeText}
                </div>
            </div>
        `;
    }).join('');
}

function renderLogsScrollable(logs) {
    const box = document.getElementById('logList');
    if (!box) return;

    if (!logs || logs.length === 0) {
        box.innerHTML = `
            <div class="item">
                <div class="item-main">No dispense logs yet</div>
                <div class="item-sub">Logs appear after hardware pipeline is connected</div>
            </div>
        `;
        return;
    }

    box.innerHTML = logs.map(l => `
        <div class="item">
            <div class="item-main">${l.outcome || 'Event'} • ${l.expected_med || '-'}</div>
            <div class="item-sub">${l.timestamp || ''} • ${l.patient || '-'}</div>
        </div>
    `).join('');
}
