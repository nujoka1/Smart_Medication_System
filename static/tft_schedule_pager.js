/*
MedSystem TFT Today Schedule Hybrid Scroll
- Shows numbered schedule entries
- Supports finger/mouse drag scrolling
- Shows large custom scrollbar indicator
- Keeps Up/Down buttons as reliable backup
*/

let tftScheduleRows = [];
let scheduleDragActive = false;
let scheduleDragStartY = 0;
let scheduleDragStartScroll = 0;

(function initScheduleHybridScroll() {
    injectScheduleHybridCSS();

    // Override schedule renderer from main TFT page.
    window.renderSchedule = renderScheduleHybrid;

    setTimeout(() => {
        patchScheduleButtons();
        attachScheduleDragEvents();
    }, 1000);

    setInterval(() => {
        patchScheduleButtons();
        attachScheduleDragEvents();
        updateScheduleScrollIndicator();
    }, 2000);
})();

function injectScheduleHybridCSS() {
    if (document.getElementById("tft-schedule-hybrid-css")) return;

    const style = document.createElement("style");
    style.id = "tft-schedule-hybrid-css";
    style.textContent = `
        #scheduleList {
            height: 192px !important;
            max-height: 192px !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            padding-right: 34px !important;
            position: relative !important;
            touch-action: none !important;
            -webkit-overflow-scrolling: touch !important;
        }

        #scheduleList::-webkit-scrollbar {
            width: 22px !important;
        }

        #scheduleList::-webkit-scrollbar-track {
            background: #100d20 !important;
            border-radius: 20px !important;
        }

        #scheduleList::-webkit-scrollbar-thumb {
            background: linear-gradient(#a855f7, #00c853) !important;
            border-radius: 20px !important;
            border: 3px solid #100d20 !important;
        }

        .schedule-custom-rail {
            position: absolute;
            top: 43px;
            right: 10px;
            width: 26px;
            height: 192px;
            border-radius: 16px;
            background: #100d20;
            border: 1px solid #332552;
            pointer-events: none;
            z-index: 20;
        }

        .schedule-custom-thumb {
            position: absolute;
            left: 3px;
            top: 3px;
            width: 18px;
            min-height: 34px;
            border-radius: 14px;
            background: linear-gradient(#a855f7, #00c853);
            transition: top 0.12s linear, height 0.12s linear;
        }

        .schedule-scroll-hint {
            position: absolute;
            top: 41px;
            right: 40px;
            font-size: 10px;
            color: #18e179;
            font-weight: 900;
            z-index: 20;
        }

        .schedule-number {
            display: inline-block;
            min-width: 22px;
            color: #a855f7;
            font-weight: 900;
        }

        .schedule-time-green {
            color: #18e179;
            font-weight: 900;
        }

        .schedule-item-main {
            font-size: 15px;
            font-weight: 900;
            line-height: 1.15;
        }

        .schedule-item-sub {
            font-size: 11px;
            color: #b9aecf;
            margin-top: 2px;
            line-height: 1.2;
        }

        .schedule-mode {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 999px;
            font-size: 10px;
            font-weight: 900;
            margin-left: 4px;
        }

        .schedule-mode-ai {
            color: #c084fc;
            background: rgba(168, 85, 247, 0.18);
            border: 1px solid rgba(168, 85, 247, 0.45);
        }

        .schedule-mode-custom {
            color: #18e179;
            background: rgba(0, 200, 83, 0.16);
            border: 1px solid rgba(0, 200, 83, 0.45);
        }

        #schedule .item {
            min-height: 56px !important;
            margin-bottom: 7px !important;
        }

        #schedule .bottom {
            grid-template-columns: 1fr 1fr 1fr !important;
            gap: 6px !important;
        }

        #schedule .bottom button {
            height: 48px !important;
            font-size: 15px !important;
            border-radius: 12px !important;
        }
    `;
    document.head.appendChild(style);
}

function scheduleModeBadge(aiClass) {
    if (aiClass && aiClass !== "custom") {
        return '<span class="schedule-mode schedule-mode-ai">AI</span>';
    }
    return '<span class="schedule-mode schedule-mode-custom">COUNT</span>';
}

function renderScheduleHybrid(schedule, meds) {
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
        patchScheduleButtons();
        ensureScheduleIndicator();
        updateScheduleScrollIndicator();
        return;
    }

    box.innerHTML = tftScheduleRows.map((s, index) => {
        const aiClass = s.ai_class || "custom";
        const modeText = aiClass !== "custom" ? "AI + camera + count" : "Count + camera only";

        return `
            <div class="item">
                <div class="schedule-item-main">
                    <span class="schedule-number">${index + 1}.</span>
                    <span class="schedule-time-green">${s.time || "--:--"}</span>
                    • ${s.med || "Medication"}
                    ${scheduleModeBadge(aiClass)}
                </div>
                <div class="schedule-item-sub">
                    ${s.patient || "Patient"} • Qty ${s.qty || 1} • Comp ${s.compartment ?? "-"} • ${modeText}
                </div>
            </div>
        `;
    }).join("");

    patchScheduleButtons();
    ensureScheduleIndicator();
    attachScheduleDragEvents();
    setTimeout(updateScheduleScrollIndicator, 100);
}

function patchScheduleButtons() {
    const schedule = document.getElementById("schedule");
    if (!schedule) return;

    const bottom = schedule.querySelector(".bottom");
    if (!bottom) return;

    bottom.innerHTML = `
        <button class="btn-dark" onclick="showScreen('home')">Back</button>
        <button class="btn-purple" onclick="scrollScheduleBy(-1)">▲ Up</button>
        <button class="btn-green" onclick="scrollScheduleBy(1)">▼ Down</button>
    `;
}

function scrollScheduleBy(direction) {
    const box = document.getElementById("scheduleList");
    if (!box) return;

    box.scrollBy({
        top: direction * 110,
        left: 0,
        behavior: "smooth"
    });

    setTimeout(updateScheduleScrollIndicator, 160);
}

function ensureScheduleIndicator() {
    const schedule = document.getElementById("schedule");
    if (!schedule) return;

    if (!document.getElementById("scheduleScrollHint")) {
        const hint = document.createElement("div");
        hint.id = "scheduleScrollHint";
        hint.className = "schedule-scroll-hint";
        hint.textContent = "Scroll";
        schedule.appendChild(hint);
    }

    if (!document.getElementById("scheduleCustomRail")) {
        const rail = document.createElement("div");
        rail.id = "scheduleCustomRail";
        rail.className = "schedule-custom-rail";
        rail.innerHTML = '<div id="scheduleCustomThumb" class="schedule-custom-thumb"></div>';
        schedule.appendChild(rail);
    }
}

function updateScheduleScrollIndicator() {
    const box = document.getElementById("scheduleList");
    const thumb = document.getElementById("scheduleCustomThumb");
    if (!box || !thumb) return;

    const visible = box.clientHeight;
    const total = box.scrollHeight;

    if (total <= visible + 2) {
        thumb.style.top = "3px";
        thumb.style.height = "186px";
        return;
    }

    const railHeight = 192;
    const minThumb = 34;
    const thumbHeight = Math.max(minThumb, Math.floor((visible / total) * railHeight));
    const maxTop = railHeight - thumbHeight - 6;
    const ratio = box.scrollTop / Math.max(1, total - visible);
    const top = 3 + Math.floor(ratio * maxTop);

    thumb.style.height = `${thumbHeight}px`;
    thumb.style.top = `${top}px`;
}

function attachScheduleDragEvents() {
    const box = document.getElementById("scheduleList");
    if (!box || box.dataset.dragReady === "yes") return;

    box.dataset.dragReady = "yes";

    box.addEventListener("scroll", updateScheduleScrollIndicator);

    box.addEventListener("mousedown", function(e) {
        scheduleDragActive = true;
        scheduleDragStartY = e.clientY;
        scheduleDragStartScroll = box.scrollTop;
        e.preventDefault();
    });

    window.addEventListener("mousemove", function(e) {
        if (!scheduleDragActive) return;
        const dy = e.clientY - scheduleDragStartY;
        box.scrollTop = scheduleDragStartScroll - dy;
        updateScheduleScrollIndicator();
    });

    window.addEventListener("mouseup", function() {
        scheduleDragActive = false;
    });

    box.addEventListener("touchstart", function(e) {
        if (!e.touches || !e.touches.length) return;
        scheduleDragActive = true;
        scheduleDragStartY = e.touches[0].clientY;
        scheduleDragStartScroll = box.scrollTop;
        e.preventDefault();
    }, { passive: false });

    box.addEventListener("touchmove", function(e) {
        if (!scheduleDragActive || !e.touches || !e.touches.length) return;
        const dy = e.touches[0].clientY - scheduleDragStartY;
        box.scrollTop = scheduleDragStartScroll - dy;
        updateScheduleScrollIndicator();
        e.preventDefault();
    }, { passive: false });

    box.addEventListener("touchend", function() {
        scheduleDragActive = false;
    });
}
