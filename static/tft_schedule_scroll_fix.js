/*
MedSystem TFT Schedule Scroll Fix
Adds reliable UP/DOWN buttons for Today Schedule on resistive TFT.
*/

(function initScheduleScrollFix() {
    injectScheduleScrollFixCSS();

    setTimeout(() => {
        patchScheduleScreenButtons();
    }, 800);

    // Re-apply after navigation/data refresh
    setInterval(() => {
        patchScheduleScreenButtons();
    }, 3000);
})();

function injectScheduleScrollFixCSS() {
    if (document.getElementById("schedule-scroll-fix-css")) return;

    const style = document.createElement("style");
    style.id = "schedule-scroll-fix-css";
    style.textContent = `
        #scheduleList {
            height: 196px !important;
            max-height: 196px !important;
            overflow-y: scroll !important;
            overflow-x: hidden !important;
            padding-right: 10px !important;
            touch-action: pan-y !important;
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

        .schedule-scroll-bottom {
            grid-template-columns: 1fr 1fr 1fr !important;
            gap: 6px !important;
        }

        .schedule-scroll-bottom button {
            height: 48px !important;
            font-size: 15px !important;
            border-radius: 12px !important;
        }

        .schedule-scroll-hint {
            position: absolute;
            right: 12px;
            top: 42px;
            font-size: 11px;
            color: #18e179;
            font-weight: 900;
        }
    `;
    document.head.appendChild(style);
}

function patchScheduleScreenButtons() {
    const schedule = document.getElementById("schedule");
    if (!schedule) return;

    const bottom = schedule.querySelector(".bottom");
    if (!bottom) return;

    if (bottom.dataset.scrollFixed === "yes") return;

    bottom.dataset.scrollFixed = "yes";
    bottom.classList.add("schedule-scroll-bottom");

    bottom.innerHTML = `
        <button class="btn-dark" onclick="showScreen('home')">Back</button>
        <button class="btn-purple" onclick="scrollTodaySchedule(-1)">▲ Up</button>
        <button class="btn-green" onclick="scrollTodaySchedule(1)">▼ Down</button>
    `;

    if (!document.getElementById("scheduleScrollHint")) {
        const hint = document.createElement("div");
        hint.id = "scheduleScrollHint";
        hint.className = "schedule-scroll-hint";
        hint.textContent = "Scroll";
        schedule.appendChild(hint);
    }
}

function scrollTodaySchedule(direction) {
    const box = document.getElementById("scheduleList");
    if (!box) return;

    const amount = 112 * direction;
    box.scrollBy({
        top: amount,
        left: 0,
        behavior: "smooth"
    });
}
