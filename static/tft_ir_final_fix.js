/*
MedSystem TFT IR Final Fix v2
Self-contained IR screen controller.
- Rebuilds IR screen content
- Auto-refreshes when IR Test page opens
- Start forces live polling
- Reset resets counts and refreshes immediately
- Settings Refresh visibly refreshes device tile handlers
*/

let finalIRTimer = null;
let finalIRCounts = [0, 0, 0, 0, 0, 0];
let finalIRPrev = [false, false, false, false, false, false];

(function initFinalIRFixV2() {
    injectFinalIRCSS();
    installShowScreenHook();

    setTimeout(finalPatchAll, 1200);
    setInterval(finalPatchAll, 3000);
})();

function injectFinalIRCSS() {
    if (document.getElementById("final-ir-fix-css-v2")) return;

    const style = document.createElement("style");
    style.id = "final-ir-fix-css-v2";
    style.textContent = `
        #ir-test .bottom,
        #settings .bottom {
            z-index: 30000 !important;
            pointer-events: auto !important;
            display: grid !important;
            grid-template-columns: 1fr 1fr 1fr !important;
            gap: 6px !important;
        }

        #ir-test .bottom button,
        #settings .bottom button {
            height: 52px !important;
            font-size: 16px !important;
            border-radius: 13px !important;
            z-index: 31000 !important;
            pointer-events: auto !important;
        }

        .ir-live-box {
            height: 198px;
            overflow-y: auto;
            overflow-x: hidden;
            padding-right: 8px;
            margin-bottom: 58px;
        }

        .ir-live-box::-webkit-scrollbar {
            width: 20px;
        }

        .ir-live-box::-webkit-scrollbar-track {
            background: #100d20;
            border-radius: 20px;
        }

        .ir-live-box::-webkit-scrollbar-thumb {
            background: linear-gradient(#a855f7, #00c853);
            border-radius: 20px;
            border: 3px solid #100d20;
        }

        .ir-live-raw {
            background: #151128;
            border: 1px solid #332552;
            border-radius: 12px;
            padding: 7px 9px;
            margin-bottom: 7px;
        }

        .ir-live-main {
            font-size: 15px;
            font-weight: 900;
            color: #18e179;
        }

        .ir-live-sub {
            font-size: 11px;
            color: #b9aecf;
            margin-top: 2px;
        }

        .ir-live-row {
            display: grid;
            grid-template-columns: 52px 1fr 58px;
            align-items: center;
            gap: 6px;
            background: #100d20;
            border: 1px solid #332552;
            border-radius: 12px;
            padding: 7px 8px;
            margin-bottom: 6px;
            min-height: 42px;
        }

        .ir-live-name {
            font-size: 15px;
            font-weight: 900;
            color: #ffffff;
        }

        .ir-live-state {
            font-size: 15px;
            font-weight: 900;
        }

        .ir-live-clear {
            color: #18e179;
        }

        .ir-live-detect {
            color: #f59e0b;
        }

        .ir-live-count {
            font-size: 15px;
            font-weight: 900;
            text-align: right;
            color: #a855f7;
        }

        .final-toast {
            position: absolute;
            left: 18px;
            right: 18px;
            bottom: 72px;
            padding: 9px;
            border-radius: 14px;
            text-align: center;
            background: #151128;
            border: 2px solid #00c853;
            color: white;
            font-size: 16px;
            font-weight: 900;
            z-index: 40000;
        }
    `;
    document.head.appendChild(style);
}

function finalToast(msg) {
    let old = document.getElementById("finalToast");
    if (old) old.remove();

    const active = document.querySelector(".screen.active") || document.body;
    const div = document.createElement("div");
    div.id = "finalToast";
    div.className = "final-toast";
    div.textContent = msg;
    active.appendChild(div);

    setTimeout(() => {
        const now = document.getElementById("finalToast");
        if (now) now.remove();
    }, 1400);
}

function finalPatchAll() {
    patchSettingsFinal();
    rebuildIRScreen();
    patchIRFinalButtons();
}

function patchSettingsFinal() {
    const settings = document.getElementById("settings");
    if (!settings) return;

    const tiles = settings.querySelectorAll(".menu-grid button");

    if (tiles.length >= 1) {
        tiles[0].onclick = function () {
            if (typeof loadHardwareStatus === "function") loadHardwareStatus();
            showScreen("hardware-status");
        };

        const title = tiles[0].querySelector(".m-title");
        const sub = tiles[0].querySelector(".m-sub");
        if (title) title.textContent = "Hardware";
        if (sub) sub.textContent = "I2C, IR, services, CPU";
    }

    if (tiles.length >= 2) {
        tiles[1].onclick = function () {
            showScreen("ir-test");
            finalIRStart();
        };

        const title = tiles[1].querySelector(".m-title");
        const sub = tiles[1].querySelector(".m-sub");
        if (title) title.textContent = "IR Test";
        if (sub) sub.textContent = "Live pill sensor check";
    }

    const bottom = settings.querySelector(".bottom");
    if (bottom) {
        bottom.innerHTML = `
            <button id="settingsBackFinal" class="btn-dark" type="button">Back</button>
            <button id="settingsRefreshFinal" class="btn-purple" type="button">Refresh</button>
            <button id="settingsHomeFinal" class="btn-green" type="button">Home</button>
        `;

        bindFinalButton("settingsBackFinal", () => showScreen("menu"));
        bindFinalButton("settingsHomeFinal", () => showScreen("home"));
        bindFinalButton("settingsRefreshFinal", async () => {
            patchSettingsFinal();
            if (typeof loadData === "function") await loadData();
            finalToast("Settings refreshed");
        });
    }
}

function rebuildIRScreen() {
    const ir = document.getElementById("ir-test");
    if (!ir) return;

    if (ir.dataset.finalBuilt === "yes") return;
    ir.dataset.finalBuilt = "yes";

    ir.innerHTML = `
        <div class="header">
            <div class="title">IR TEST</div>
            <div class="time"></div>
        </div>

        <div class="ir-live-box">
            <div class="ir-live-raw">
                <div class="ir-live-main">RAW: <span id="finalIRRaw">--------</span></div>
                <div class="ir-live-sub">Address 0x23 • Active LOW • IR1-IR6 on P0-P5</div>
                <div class="ir-live-sub">Status: <span id="finalIRStatus">Waiting</span></div>
            </div>

            <div id="finalIRRows">
                ${[1,2,3,4,5,6].map(i => `
                    <div class="ir-live-row">
                        <div class="ir-live-name">IR${i}</div>
                        <div class="ir-live-state ir-live-clear">WAIT</div>
                        <div class="ir-live-count">0</div>
                    </div>
                `).join("")}
            </div>
        </div>

        <div class="bottom three compact-bottom">
            <button id="finalIRBack" class="btn-dark" type="button">Back</button>
            <button id="finalIRReset" class="btn-purple" type="button">Reset</button>
            <button id="finalIRStart" class="btn-green" type="button">Start</button>
        </div>
    `;
}

function patchIRFinalButtons() {
    const ir = document.getElementById("ir-test");
    if (!ir) return;

    bindFinalButton("finalIRBack", () => {
        finalIRStop();
        showScreen("settings");
    });

    bindFinalButton("finalIRReset", () => {
        finalIRReset();
    });

    bindFinalButton("finalIRStart", () => {
        finalIRStart();
    });
}

function bindFinalButton(id, handler) {
    const btn = document.getElementById(id);
    if (!btn) return;

    if (btn.dataset.bound === "yes") return;
    btn.dataset.bound = "yes";

    btn.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        handler();
    }, { passive: false });

    btn.addEventListener("touchstart", function(e) {
        e.preventDefault();
        e.stopPropagation();
        handler();
    }, { passive: false });
}

function finalIRStart() {
    rebuildIRScreen();
    patchIRFinalButtons();

    finalIRStop();
    finalIRReadOnce();

    finalIRTimer = setInterval(finalIRReadOnce, 400);

    const status = document.getElementById("finalIRStatus");
    if (status) status.textContent = "LIVE";

    finalToast("IR live started");
}

function finalIRStop() {
    if (finalIRTimer) {
        clearInterval(finalIRTimer);
        finalIRTimer = null;
    }

    const status = document.getElementById("finalIRStatus");
    if (status) status.textContent = "Stopped";
}

function finalIRReset() {
    finalIRCounts = [0, 0, 0, 0, 0, 0];
    finalIRPrev = [false, false, false, false, false, false];

    finalIRReadOnce();

    const status = document.getElementById("finalIRStatus");
    if (status) status.textContent = "Counts reset";

    finalToast("IR counts reset");
}

async function finalIRReadOnce() {
    const rawBox = document.getElementById("finalIRRaw");
    const rows = document.getElementById("finalIRRows");
    const status = document.getElementById("finalIRStatus");

    if (!rawBox || !rows) return;

    try {
        const res = await fetch("/api/hardware/ir-live?ts=" + Date.now());
        const data = await res.json();

        if (!data.success) {
            rawBox.textContent = "ERROR";
            if (status) status.textContent = data.error || "Read failed";
            return;
        }

        rawBox.textContent = data.raw || "--------";
        if (status && finalIRTimer) status.textContent = "LIVE";

        rows.innerHTML = data.sensors.map((s, index) => {
            const detected = !!s.detected;

            if (detected && !finalIRPrev[index]) {
                finalIRCounts[index] += 1;
            }

            finalIRPrev[index] = detected;

            const cls = detected ? "ir-live-detect" : "ir-live-clear";
            const state = detected ? "DETECT" : "CLEAR";

            return `
                <div class="ir-live-row">
                    <div class="ir-live-name">${s.name}</div>
                    <div class="ir-live-state ${cls}">${state} (${s.pin})</div>
                    <div class="ir-live-count">${finalIRCounts[index]}</div>
                </div>
            `;
        }).join("");

    } catch (e) {
        rawBox.textContent = "API ERROR";
        if (status) status.textContent = "API offline";
    }
}

function installShowScreenHook() {
    if (window.__finalIRShowScreenHooked) return;
    window.__finalIRShowScreenHooked = true;

    const oldShowScreen = window.showScreen;

    window.showScreen = function(id) {
        if (typeof oldShowScreen === "function") {
            oldShowScreen(id);
        }

        setTimeout(() => {
            finalPatchAll();

            if (id === "ir-test") {
                finalIRStart();
            } else if (id !== "ir-test") {
                finalIRStop();
            }
        }, 80);
    };
}

window.finalIRStart = finalIRStart;
window.finalIRReset = finalIRReset;
window.finalIRStop = finalIRStop;
window.finalIRReadOnce = finalIRReadOnce;
