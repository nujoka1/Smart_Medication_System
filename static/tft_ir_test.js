/*
MedSystem TFT Live IR Test
Reads IR sensors from /api/hardware/ir-live.
Safe test only. No motor movement.
*/

let irPollTimer = null;
let irPreviousDetected = [false, false, false, false, false, false];
let irCounts = [0, 0, 0, 0, 0, 0];

(function initIRTest() {
    injectIRTestCSS();
    injectIRTestScreen();
    patchSettingsIRButton();
})();

function injectIRTestCSS() {
    if (document.getElementById("ir-test-css")) return;

    const style = document.createElement("style");
    style.id = "ir-test-css";
    style.textContent = `
        .ir-grid {
            height: 210px;
            overflow-y: auto;
            overflow-x: hidden;
            padding-right: 8px;
        }

        .ir-grid::-webkit-scrollbar {
            width: 20px;
        }

        .ir-grid::-webkit-scrollbar-track {
            background: #100d20;
            border-radius: 20px;
        }

        .ir-grid::-webkit-scrollbar-thumb {
            background: linear-gradient(#a855f7, #00c853);
            border-radius: 20px;
            border: 3px solid #100d20;
        }

        .ir-row {
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

        .ir-name {
            font-size: 15px;
            font-weight: 900;
            color: #ffffff;
        }

        .ir-state {
            font-size: 15px;
            font-weight: 900;
        }

        .ir-clear {
            color: #18e179;
        }

        .ir-detect {
            color: #f59e0b;
        }

        .ir-count {
            font-size: 15px;
            font-weight: 900;
            text-align: right;
            color: #a855f7;
        }

        .ir-raw {
            background: #151128;
            border: 1px solid #332552;
            border-radius: 12px;
            padding: 7px 9px;
            margin-bottom: 7px;
        }

        .ir-raw-main {
            font-size: 15px;
            font-weight: 900;
            color: #18e179;
        }

        .ir-raw-sub {
            font-size: 11px;
            color: #b9aecf;
            margin-top: 2px;
        }
    `;
    document.head.appendChild(style);
}

function injectIRTestScreen() {
    if (document.getElementById("ir-test")) return;

    const wrap = document.createElement("div");
    wrap.innerHTML = `
        <div id="ir-test" class="screen">
            <div class="header">
                <div class="title">IR TEST</div>
                <div class="time"></div>
            </div>

            <div class="ir-grid">
                <div class="ir-raw">
                    <div class="ir-raw-main">RAW: <span id="irRawValue">--------</span></div>
                    <div class="ir-raw-sub">Address 0x23 • Active LOW • P0-P5</div>
                </div>

                <div id="irRows">
                    <div class="ir-row">
                        <div class="ir-name">IR</div>
                        <div class="ir-state">Loading...</div>
                        <div class="ir-count">--</div>
                    </div>
                </div>
            </div>

            <div class="bottom three compact-bottom">
                <button class="btn-dark" onclick="stopIRTest(); showScreen('settings')">Back</button>
                <button class="btn-purple" onclick="resetIRCounts()">Reset</button>
                <button class="btn-green" onclick="startIRTest()">Start</button>
            </div>
        </div>
    `;

    document.body.appendChild(wrap);
}

function patchSettingsIRButton() {
    setTimeout(() => {
        const settings = document.getElementById("settings");
        if (!settings) return;

        const buttons = settings.querySelectorAll("button");
        if (!buttons || buttons.length < 2) return;

        // Replace second settings tile with IR Test.
        buttons[1].onclick = function () {
            showScreen("ir-test");
            startIRTest();
        };

        const title = buttons[1].querySelector(".m-title");
        const sub = buttons[1].querySelector(".m-sub");

        if (title) title.textContent = "IR Test";
        if (sub) sub.textContent = "Live pill sensor check";
    }, 1200);
}

function startIRTest() {
    if (irPollTimer) clearInterval(irPollTimer);

    loadIRLive();
    irPollTimer = setInterval(loadIRLive, 400);
}

function stopIRTest() {
    if (irPollTimer) {
        clearInterval(irPollTimer);
        irPollTimer = null;
    }
}

function resetIRCounts() {
    irCounts = [0, 0, 0, 0, 0, 0];
    irPreviousDetected = [false, false, false, false, false, false];
    loadIRLive();
}

async function loadIRLive() {
    const rows = document.getElementById("irRows");
    const raw = document.getElementById("irRawValue");

    if (!rows || !raw) return;

    try {
        const res = await fetch("/api/hardware/ir-live");
        const data = await res.json();

        if (!data.success) {
            raw.textContent = "ERROR";
            rows.innerHTML = `
                <div class="ir-row">
                    <div class="ir-name">ERR</div>
                    <div class="ir-state ir-detect">${data.error || "Read failed"}</div>
                    <div class="ir-count">--</div>
                </div>
            `;
            return;
        }

        raw.textContent = data.raw || "--------";

        rows.innerHTML = data.sensors.map((s, index) => {
            const detected = !!s.detected;

            // Count only CLEAR -> DETECT transition
            if (detected && !irPreviousDetected[index]) {
                irCounts[index] += 1;
            }

            irPreviousDetected[index] = detected;

            const cls = detected ? "ir-detect" : "ir-clear";

            return `
                <div class="ir-row">
                    <div class="ir-name">${s.name}</div>
                    <div class="ir-state ${cls}">${s.state} (${s.pin})</div>
                    <div class="ir-count">${irCounts[index]}</div>
                </div>
            `;
        }).join("");

    } catch (e) {
        raw.textContent = "ERROR";
        rows.innerHTML = `
            <div class="ir-row">
                <div class="ir-name">API</div>
                <div class="ir-state ir-detect">Offline</div>
                <div class="ir-count">--</div>
            </div>
        `;
    }
}
