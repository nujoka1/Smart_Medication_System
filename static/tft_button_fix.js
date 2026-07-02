/*
MedSystem TFT Button Fix
Fixes Settings refresh and IR Test Reset/Start buttons.
Loaded last so it overrides older button handlers.
*/

(function initTFTButtonFix() {
    injectButtonFixCSS();

    setTimeout(patchAllTFTButtons, 1000);
    setInterval(patchAllTFTButtons, 3000);
})();

function injectButtonFixCSS() {
    if (document.getElementById("tft-button-fix-css")) return;

    const style = document.createElement("style");
    style.id = "tft-button-fix-css";
    style.textContent = `
        .bottom {
            z-index: 9999 !important;
            pointer-events: auto !important;
        }

        .bottom button {
            pointer-events: auto !important;
            position: relative !important;
            z-index: 10000 !important;
        }

        #ir-test .bottom button,
        #settings .bottom button {
            height: 48px !important;
            font-size: 15px !important;
            border-radius: 12px !important;
        }

        #ir-test .ir-grid {
            height: 204px !important;
            margin-bottom: 52px !important;
        }

        .tft-toast {
            position: absolute;
            left: 18px;
            right: 18px;
            bottom: 70px;
            background: #151128;
            border: 2px solid #00c853;
            color: #ffffff;
            border-radius: 14px;
            padding: 10px;
            text-align: center;
            font-size: 16px;
            font-weight: 900;
            z-index: 20000;
        }
    `;
    document.head.appendChild(style);
}

function tftToast(msg) {
    let old = document.getElementById("tftToast");
    if (old) old.remove();

    const active = document.querySelector(".screen.active") || document.body;
    const div = document.createElement("div");
    div.id = "tftToast";
    div.className = "tft-toast";
    div.textContent = msg;

    active.appendChild(div);

    setTimeout(() => {
        const now = document.getElementById("tftToast");
        if (now) now.remove();
    }, 1800);
}

function patchAllTFTButtons() {
    patchSettingsButtons();
    patchIRButtons();
}

function patchSettingsButtons() {
    const settings = document.getElementById("settings");
    if (!settings) return;

    const bottom = settings.querySelector(".bottom");
    if (bottom && bottom.dataset.fixed !== "yes") {
        bottom.dataset.fixed = "yes";
        bottom.classList.add("three");
        bottom.classList.add("compact-bottom");

        bottom.innerHTML = `
            <button id="settingsBackBtn" class="btn-dark">Back</button>
            <button id="settingsRefreshBtn" class="btn-purple">Refresh</button>
            <button id="settingsHomeBtn" class="btn-green">Home</button>
        `;
    }

    const backBtn = document.getElementById("settingsBackBtn");
    const refreshBtn = document.getElementById("settingsRefreshBtn");
    const homeBtn = document.getElementById("settingsHomeBtn");

    if (backBtn) {
        backBtn.onclick = function () {
            showScreen("menu");
        };
    }

    if (homeBtn) {
        homeBtn.onclick = function () {
            showScreen("home");
        };
    }

    if (refreshBtn) {
        refreshBtn.onclick = async function () {
            try {
                await loadData();
                tftToast("Settings refreshed");
            } catch (e) {
                tftToast("Refresh failed");
            }
        };
    }

    // Make sure Settings tiles stay correct
    const buttons = settings.querySelectorAll(".menu-grid button");

    if (buttons.length >= 1) {
        buttons[0].onclick = function () {
            if (typeof loadHardwareStatus === "function") loadHardwareStatus();
            showScreen("hardware-status");
        };

        const title = buttons[0].querySelector(".m-title");
        const sub = buttons[0].querySelector(".m-sub");
        if (title) title.textContent = "Hardware";
        if (sub) sub.textContent = "I2C, IR, services, CPU";
    }

    if (buttons.length >= 2) {
        buttons[1].onclick = function () {
            showScreen("ir-test");
            if (typeof startIRTest === "function") startIRTest();
        };

        const title = buttons[1].querySelector(".m-title");
        const sub = buttons[1].querySelector(".m-sub");
        if (title) title.textContent = "IR Test";
        if (sub) sub.textContent = "Live pill sensor check";
    }
}

function patchIRButtons() {
    const ir = document.getElementById("ir-test");
    if (!ir) return;

    const bottom = ir.querySelector(".bottom");
    if (!bottom) return;

    if (bottom.dataset.fixed !== "yes") {
        bottom.dataset.fixed = "yes";
        bottom.classList.add("three");
        bottom.classList.add("compact-bottom");

        bottom.innerHTML = `
            <button id="irBackBtn" class="btn-dark">Back</button>
            <button id="irResetBtn" class="btn-purple">Reset</button>
            <button id="irStartBtn" class="btn-green">Start</button>
        `;
    }

    const backBtn = document.getElementById("irBackBtn");
    const resetBtn = document.getElementById("irResetBtn");
    const startBtn = document.getElementById("irStartBtn");

    if (backBtn) {
        backBtn.onclick = function () {
            if (typeof stopIRTest === "function") stopIRTest();
            showScreen("settings");
        };
    }

    if (resetBtn) {
        resetBtn.onclick = function () {
            if (typeof resetIRCounts === "function") {
                resetIRCounts();
                tftToast("IR counts reset");
            } else {
                tftToast("Reset function missing");
            }
        };
    }

    if (startBtn) {
        startBtn.onclick = function () {
            if (typeof startIRTest === "function") {
                startIRTest();
                tftToast("IR test started");
            } else {
                tftToast("Start function missing");
            }
        };
    }
}
