/*
TFT Dispense Test Page
Motor rotation + matching IR count.

Enabled:
Motor 1 -> IR1
Motor 3 -> IR3
Motor 5 -> IR5

Disabled:
Motor 2, 4, 6 until P3 wiring is isolated.
*/

let dispenseDelayUs = Number(localStorage.getItem("dispenseDelayUs") || 10000);
let dispenseQty = Number(localStorage.getItem("dispenseQty") || 1);
let dispenseReverse = localStorage.getItem("dispenseReverse") === "true";

const DISPENSE_DEFAULT_DELAY_US = 10000;
const DISPENSE_DEFAULT_QTY = 1;
const DISPENSE_MIN_DELAY_US = 7000;
const DISPENSE_MAX_DELAY_US = 20000;
const DISPENSE_STEP_US = 1000;
const DISPENSE_MIN_QTY = 1;
const DISPENSE_MAX_QTY = 5;

(function initDispenseTest() {
    injectDispenseCSS();
    buildDispenseScreen();
    setTimeout(addDispenseButtonToSettings, 1000);
    setInterval(addDispenseButtonToSettings, 3000);
    setTimeout(updateDispenseUI, 500);
})();

function injectDispenseCSS() {
    if (document.getElementById("dispense-test-css")) return;

    const style = document.createElement("style");
    style.id = "dispense-test-css";
    style.textContent = `
        #dispense-test {
            overflow: hidden;
        }

        .dispense-scroll {
            height: 224px;
            overflow-y: auto;
            overflow-x: hidden;
            padding-right: 8px;
            padding-bottom: 74px;
            touch-action: pan-y;
        }

        .dispense-scroll::-webkit-scrollbar {
            width: 20px;
        }

        .dispense-scroll::-webkit-scrollbar-track {
            background: #100d20;
            border-radius: 20px;
        }

        .dispense-scroll::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, #7c3aed, #00c853);
            border-radius: 20px;
            border: 3px solid #100d20;
        }

        .dispense-card {
            background:#100d20;
            border:1px solid var(--line);
            border-radius:14px;
            padding:10px;
            margin-bottom:8px;
        }

        .dispense-title {
            font-size:17px;
            font-weight:900;
            color:#ffffff;
        }

        .dispense-sub {
            font-size:11px;
            color:var(--muted);
            margin-top:3px;
            line-height:1.25;
        }

        .dispense-grid,
        .dispense-controls {
            display:grid;
            grid-template-columns:1fr 1fr 1fr;
            gap:8px;
            margin-top:8px;
        }

        .dispense-grid button,
        .dispense-controls button {
            height:48px;
            border-radius:13px;
            font-size:15px;
            font-weight:900;
        }

        .dispense-value {
            background:#06040f;
            border:1px solid var(--line);
            border-radius:12px;
            padding:8px;
            margin-top:8px;
        }

        .dispense-value-main {
            font-size:21px;
            color:var(--green2);
            font-weight:900;
            line-height:1;
        }

        .dispense-value-sub {
            font-size:11px;
            color:var(--muted);
            margin-top:4px;
        }

        .dispense-status {
            min-height:72px;
            max-height:96px;
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

        .dispense-note {
            background:rgba(245, 158, 11, 0.12);
            border:1px solid rgba(245, 158, 11, 0.45);
            color:#ffd28a;
            border-radius:12px;
            padding:8px;
            margin-top:8px;
            font-size:11px;
            line-height:1.25;
            font-weight:700;
        }

        .dispense-disabled {
            opacity:0.6;
            border:1px dashed #5a4b75 !important;
        }

        #dispense-test .bottom {
            z-index:30000 !important;
        }

        #dispense-test .bottom button {
            height:48px !important;
            font-size:14px !important;
            border-radius:12px !important;
        }
    `;
    document.head.appendChild(style);
}

function buildDispenseScreen() {
    if (document.getElementById("dispense-test")) return;

    const div = document.createElement("div");
    div.innerHTML = `
        <div id="dispense-test" class="screen">
            <div class="header">
                <div class="title">DISPENSE + EVID.</div>
                <div class="time"></div>
            </div>

            <div class="dispense-scroll">

                <div class="dispense-card">
                    <div class="dispense-title">Test Settings</div>
                    <div class="dispense-sub">
                        Motor dispenses, IR count is recorded, then camera evidence is captured.
                    </div>

                    <div class="dispense-value">
                        <div class="dispense-value-main" id="dispenseValueText">Qty 1 | 10000 us</div>
                        <div class="dispense-value-sub" id="dispenseModeText">Forward direction</div>
                    </div>

                    <div class="dispense-controls">
                        <button class="btn-purple" onclick="dispenseQtyUp()">Qty +</button>
                        <button class="btn-dark" onclick="dispenseQtyDown()">Qty −</button>
                        <button class="btn-green" onclick="dispenseResetDefault()">Default</button>
                    </div>

                    <div class="dispense-controls">
                        <button class="btn-purple" onclick="dispenseFaster()">Faster</button>
                        <button class="btn-dark" onclick="dispenseSlower()">Slower</button>
                        <button class="btn-amber" onclick="dispenseToggleReverse()">Direction</button>
                    </div>
                </div>

                <div class="dispense-card">
                    <div class="dispense-title">Ready Paths</div>
                    <div class="dispense-sub">
                        Motor 1 uses IR1, Motor 3 uses IR3, and Motor 5 uses IR5.
                    </div>

                    <div class="dispense-grid">
                        <button class="btn-purple" onclick="runDispenseTest(1)">M1 / IR1</button>
                        <button class="btn-purple" onclick="runDispenseTest(3)">M3 / IR3</button>
                        <button class="btn-purple" onclick="runDispenseTest(5)">M5 / IR5</button>
                    </div>
                </div>

                <div class="dispense-card dispense-disabled">
                    <div class="dispense-title">Not Ready Yet</div>
                    <div class="dispense-sub">
                        Motors 2, 4 and 6 are disabled until P3 wiring is isolated.
                    </div>

                    <div class="dispense-grid">
                        <button class="btn-dark" onclick="disabledDispenseNotice(2)">M2</button>
                        <button class="btn-dark" onclick="disabledDispenseNotice(4)">M4</button>
                        <button class="btn-dark" onclick="disabledDispenseNotice(6)">M6</button>
                    </div>

                    <div class="dispense-note">
                        Safety note: even motors are not used in dispense mode because their P3/D-line triggered multiple stepper LEDs during testing.
                    </div>
                </div>

                <div class="dispense-card">
                    <div class="dispense-title">Status</div>
                    <div class="dispense-status" id="dispenseStatus">
                        Ready. Select Motor 1, 3 or 5.
                    </div>
                </div>

            </div>

            <div class="bottom three compact-bottom">
                <button class="btn-dark" onclick="showScreen('settings')">Back</button>
                <button class="btn-purple" onclick="dispenseAllOff()">All Off</button>
                <button class="btn-green" onclick="showScreen('home')">Home</button>
            </div>
        </div>
    `;

    document.body.appendChild(div);
}

function addDispenseButtonToSettings() {
    const settings = document.getElementById("settings");
    if (!settings) return;

    const grid = settings.querySelector(".menu-grid");
    if (!grid) return;

    if (document.getElementById("dispenseSettingsButton")) return;

    const btn = document.createElement("button");
    btn.id = "dispenseSettingsButton";
    btn.className = "menu-btn";
    btn.onclick = function () {
        updateDispenseUI();
        showScreen("dispense-test");
    };

    btn.innerHTML = `
        <div class="m-title">Dispense + Evidence</div>
        <div class="m-sub">Motor, IR, camera</div>
    `;

    grid.appendChild(btn);
}

function updateDispenseUI() {
    localStorage.setItem("dispenseDelayUs", String(dispenseDelayUs));
    localStorage.setItem("dispenseQty", String(dispenseQty));
    localStorage.setItem("dispenseReverse", String(dispenseReverse));

    const valueText = document.getElementById("dispenseValueText");
    const modeText = document.getElementById("dispenseModeText");

    if (valueText) valueText.textContent = `Qty ${dispenseQty} | ${dispenseDelayUs} us`;
    if (modeText) modeText.textContent = dispenseReverse ? "Reverse direction" : "Forward direction";
}

function dispenseQtyUp() {
    dispenseQty = Math.min(DISPENSE_MAX_QTY, dispenseQty + 1);
    updateDispenseUI();
    setDispenseStatus(`Quantity increased to ${dispenseQty}.`);
}

function dispenseQtyDown() {
    dispenseQty = Math.max(DISPENSE_MIN_QTY, dispenseQty - 1);
    updateDispenseUI();
    setDispenseStatus(`Quantity reduced to ${dispenseQty}.`);
}

function dispenseFaster() {
    dispenseDelayUs = Math.max(DISPENSE_MIN_DELAY_US, dispenseDelayUs - DISPENSE_STEP_US);
    updateDispenseUI();
    setDispenseStatus(`Speed increased. Delay is now ${dispenseDelayUs} us.`);
}

function dispenseSlower() {
    dispenseDelayUs = Math.min(DISPENSE_MAX_DELAY_US, dispenseDelayUs + DISPENSE_STEP_US);
    updateDispenseUI();
    setDispenseStatus(`Speed reduced. Delay is now ${dispenseDelayUs} us.`);
}

function dispenseResetDefault() {
    dispenseDelayUs = DISPENSE_DEFAULT_DELAY_US;
    dispenseQty = DISPENSE_DEFAULT_QTY;
    dispenseReverse = false;
    updateDispenseUI();
    setDispenseStatus("Default restored: Qty 1, 10000 us, forward.");
}

function dispenseToggleReverse() {
    dispenseReverse = !dispenseReverse;
    updateDispenseUI();
    setDispenseStatus(dispenseReverse ? "Direction set to reverse." : "Direction set to forward.");
}

function disabledDispenseNotice(motor) {
    setDispenseStatus(`Motor ${motor} is disabled until the P3 wiring issue is isolated.`);
}

function setDispenseStatus(msg) {
    const box = document.getElementById("dispenseStatus");
    if (box) box.textContent = msg;
}

async function runDispenseTest(motor) {
    updateDispenseUI();

    const compartmentMap = {1: 1, 3: 3, 5: 5};
    const compartment = compartmentMap[motor] || motor;

    setDispenseStatus(
        `Running Motor ${motor}, Qty ${dispenseQty}, ${dispenseDelayUs} us...`
    );

    try {
        // 1. Run motor + IR dispense test
        const dispenseRes = await fetch("/api/hardware/dispense-test", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                motor: motor,
                target_count: dispenseQty,
                delay_us: dispenseDelayUs,
                timeout_s: 30,
                reverse: dispenseReverse
            })
        });

        const dispenseData = await dispenseRes.json();

        const actualCount = Number(dispenseData.actual_count || 0);
        const targetCount = Number(dispenseData.target_count || dispenseQty);
        const dispenseReason = dispenseData.reason || "UNKNOWN";

        setDispenseStatus(
            `Dispense finished: ${dispenseReason}. Count ${actualCount}/${targetCount}. Capturing evidence...`
        );

        // 2. Capture camera evidence whether count passed or failed.
        // For now this is intentional because IR tape/alignment may still be under adjustment.
        const evidenceRes = await fetch("/api/evidence/capture", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                expected_name: "TFT Test Medication",
                expected_ai_class: "custom",
                verification_mode: "count_camera_only",
                dose_time: "TFT Manual",
                dose_period: `TFT Motor ${motor} dispense test`,
                dose_quantity: targetCount,
                compartment: compartment,
                ir_target_count: targetCount,
                ir_actual_count: actualCount
            })
        });

        const evidenceData = await evidenceRes.json();

        if (evidenceData.success) {
            const decision = evidenceData.decision || "UNKNOWN";
            const eid = evidenceData.evidence_id || "saved";

            setDispenseStatus(
                `Evidence saved. Dispense: ${dispenseReason}. ` +
                `Count ${actualCount}/${targetCount}. Decision: ${decision}. ID: ${eid}.`
            );
        } else {
            setDispenseStatus(
                `Dispense: ${dispenseReason}. Count ${actualCount}/${targetCount}. ` +
                `Evidence failed: ${evidenceData.error || "camera/evidence error"}.`
            );
        }

    } catch (e) {
        setDispenseStatus("ERROR: Dispense/evidence API not reachable.");
    }
}

async function dispenseAllOff() {
    setDispenseStatus("Sending all-off command...");

    try {
        const res = await fetch("/api/hardware/stepper-off", {method: "POST"});
        const data = await res.json();

        setDispenseStatus(data.success ? "All stepper outputs OFF." : "All-off failed.");

    } catch (e) {
        setDispenseStatus("ERROR: Stepper API not reachable.");
    }
}

window.runDispenseTest = runDispenseTest;
window.dispenseAllOff = dispenseAllOff;
window.dispenseQtyUp = dispenseQtyUp;
window.dispenseQtyDown = dispenseQtyDown;
window.dispenseFaster = dispenseFaster;
window.dispenseSlower = dispenseSlower;
window.dispenseResetDefault = dispenseResetDefault;
window.dispenseToggleReverse = dispenseToggleReverse;
window.disabledDispenseNotice = disabledDispenseNotice;
