/*
TFT Stepper Test Page
Confirmed working motors: 1, 3, 5.
Motors 2, 4, 6 are shown but disabled until P3 wiring is isolated.

Features:
- Speed increase/decrease
- Reset default setting
- Scrollable layout
- Forward/reverse test
- All OFF safety button
*/

let stepperDelayUs = Number(localStorage.getItem("stepperDelayUs") || 10000);
let stepperDurationS = Number(localStorage.getItem("stepperDurationS") || 3);

const STEPPER_DEFAULT_DELAY_US = 10000;
const STEPPER_DEFAULT_DURATION_S = 3;
const STEPPER_MIN_DELAY_US = 7000;
const STEPPER_MAX_DELAY_US = 20000;
const STEPPER_STEP_US = 1000;

(function initStepperTest() {
    injectStepperCSS();
    buildStepperScreen();
    setTimeout(addStepperButtonToSettings, 1000);
    setInterval(addStepperButtonToSettings, 3000);
    setTimeout(updateStepperSettingsText, 500);
})();

function injectStepperCSS() {
    if (document.getElementById("stepper-test-css")) return;

    const style = document.createElement("style");
    style.id = "stepper-test-css";
    style.textContent = `
        #stepper-test {
            overflow: hidden;
        }

        .stepper-scroll {
            height: 224px;
            overflow-y: auto;
            overflow-x: hidden;
            padding-right: 8px;
            padding-bottom: 64px;
            touch-action: pan-y;
        }

        .stepper-scroll::-webkit-scrollbar {
            width: 20px;
        }

        .stepper-scroll::-webkit-scrollbar-track {
            background: #100d20;
            border-radius: 20px;
        }

        .stepper-scroll::-webkit-scrollbar-thumb {
            background: linear-gradient(#a855f7, #00c853);
            border-radius: 20px;
            border: 3px solid #100d20;
        }

        .stepper-card {
            background:#100d20;
            border:1px solid #342155;
            border-radius:14px;
            padding:10px;
            margin-bottom:8px;
        }

        .stepper-title {
            font-size:17px;
            font-weight:900;
            color:#ffffff;
        }

        .stepper-sub {
            font-size:11px;
            color:#b9aecf;
            margin-top:3px;
            line-height:1.25;
        }

        .stepper-grid {
            display:grid;
            grid-template-columns:1fr 1fr 1fr;
            gap:8px;
            margin-top:8px;
        }

        .stepper-grid.two {
            grid-template-columns:1fr 1fr;
        }

        .stepper-grid button {
            height:48px;
            border-radius:13px;
            font-size:15px;
            font-weight:900;
        }

        .stepper-disabled {
            opacity:0.55;
            border:1px dashed #5a4b75 !important;
        }

        .stepper-disabled button {
            opacity:0.75;
        }

        .stepper-setting-row {
            display:grid;
            grid-template-columns:1fr 1fr 1fr;
            gap:7px;
            margin-top:8px;
        }

        .stepper-setting-row button {
            height:46px;
            border-radius:12px;
            font-size:14px;
            font-weight:900;
        }

        .stepper-value {
            background:#06040f;
            border:1px solid #342155;
            border-radius:12px;
            padding:8px;
            margin-top:8px;
        }

        .stepper-value-main {
            font-size:22px;
            color:#00c853;
            font-weight:900;
            line-height:1;
        }

        .stepper-value-sub {
            font-size:11px;
            color:#b9aecf;
            margin-top:4px;
        }

        .stepper-status {
            min-height:64px;
            max-height:88px;
            overflow-y:auto;
            background:#06040f;
            border:1px solid #342155;
            border-radius:12px;
            padding:8px;
            font-size:12px;
            color:#ffffff;
            margin-top:8px;
            line-height:1.25;
        }

        .stepper-status::-webkit-scrollbar {
            width: 16px;
        }

        .stepper-status::-webkit-scrollbar-track {
            background: #100d20;
            border-radius: 20px;
        }

        .stepper-status::-webkit-scrollbar-thumb {
            background: #a855f7;
            border-radius: 20px;
            border: 3px solid #100d20;
        }

        .stepper-note {
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

        #stepper-test .bottom {
            z-index:30000 !important;
        }

        #stepper-test .bottom button {
            height:48px !important;
            font-size:14px !important;
            border-radius:12px !important;
        }
    `;
    document.head.appendChild(style);
}

function buildStepperScreen() {
    if (document.getElementById("stepper-test")) return;

    const div = document.createElement("div");
    div.innerHTML = `
        <div id="stepper-test" class="screen">
            <div class="header">
                <div class="title">STEPPER TEST</div>
                <div class="time"></div>
            </div>

            <div class="stepper-scroll">

                <div class="stepper-card">
                    <div class="stepper-title">Speed Setting</div>
                    <div class="stepper-sub">
                        Lower delay means faster motor. Default confirmed value is 10000 microseconds.
                    </div>

                    <div class="stepper-value">
                        <div class="stepper-value-main" id="stepperDelayText">10000 us</div>
                        <div class="stepper-value-sub" id="stepperSpeedHint">Default stable speed</div>
                    </div>

                    <div class="stepper-setting-row">
                        <button class="btn-purple" onclick="stepperFaster()">Faster</button>
                        <button class="btn-dark" onclick="stepperSlower()">Slower</button>
                        <button class="btn-green" onclick="stepperResetDefault()">Default</button>
                    </div>
                </div>

                <div class="stepper-card">
                    <div class="stepper-title">Ready Motors</div>
                    <div class="stepper-sub">
                        Motors 1, 3 and 5 are confirmed using full-step two-phase drive.
                    </div>

                    <div class="stepper-grid">
                        <button class="btn-purple" onclick="runStepperTest(1)">Motor 1</button>
                        <button class="btn-purple" onclick="runStepperTest(3)">Motor 3</button>
                        <button class="btn-purple" onclick="runStepperTest(5)">Motor 5</button>
                    </div>

                    <div class="stepper-grid">
                        <button class="btn-dark" onclick="runStepperTest(1,true)">M1 Rev</button>
                        <button class="btn-dark" onclick="runStepperTest(3,true)">M3 Rev</button>
                        <button class="btn-dark" onclick="runStepperTest(5,true)">M5 Rev</button>
                    </div>
                </div>

                <div class="stepper-card stepper-disabled">
                    <div class="stepper-title">Not Ready Yet</div>
                    <div class="stepper-sub">
                        Motors 2, 4 and 6 are displayed here but disabled until the P3 wiring issue is isolated.
                    </div>

                    <div class="stepper-grid">
                        <button class="btn-dark" onclick="disabledStepperNotice(2)">Motor 2</button>
                        <button class="btn-dark" onclick="disabledStepperNotice(4)">Motor 4</button>
                        <button class="btn-dark" onclick="disabledStepperNotice(6)">Motor 6</button>
                    </div>

                    <div class="stepper-note">
                        Note: P3 previously triggered multiple stepper LEDs together. These motors must not be rotated from the system until their fourth coil line is electrically isolated.
                    </div>
                </div>

                <div class="stepper-card">
                    <div class="stepper-title">Status</div>
                    <div class="stepper-status" id="stepperStatus">
                        Ready. Select Motor 1, 3 or 5.
                    </div>
                </div>

            </div>

            <div class="bottom three compact-bottom">
                <button class="btn-dark" onclick="showScreen('settings')">Back</button>
                <button class="btn-purple" onclick="stepperAllOff()">All Off</button>
                <button class="btn-green" onclick="showScreen('home')">Home</button>
            </div>
        </div>
    `;

    document.body.appendChild(div);
}

function addStepperButtonToSettings() {
    const settings = document.getElementById("settings");
    if (!settings) return;

    const grid = settings.querySelector(".menu-grid");
    if (!grid) return;

    if (document.getElementById("stepperSettingsButton")) return;

    const btn = document.createElement("button");
    btn.id = "stepperSettingsButton";
    btn.className = "menu-btn";
    btn.onclick = function () {
        updateStepperSettingsText();
        showScreen("stepper-test");
    };

    btn.innerHTML = `
        <div class="m-title">Stepper Test</div>
        <div class="m-sub">Speed and motor test</div>
    `;

    grid.appendChild(btn);
}

function updateStepperSettingsText() {
    const delayText = document.getElementById("stepperDelayText");
    const hint = document.getElementById("stepperSpeedHint");

    if (delayText) delayText.textContent = `${stepperDelayUs} us`;

    let label = "Default stable speed";
    if (stepperDelayUs < STEPPER_DEFAULT_DELAY_US) label = "Faster than default";
    if (stepperDelayUs > STEPPER_DEFAULT_DELAY_US) label = "Slower / stronger";
    if (stepperDelayUs <= 8000) label = "Fast test range";

    if (hint) hint.textContent = label;

    localStorage.setItem("stepperDelayUs", String(stepperDelayUs));
    localStorage.setItem("stepperDurationS", String(stepperDurationS));
}

function stepperFaster() {
    stepperDelayUs = Math.max(STEPPER_MIN_DELAY_US, stepperDelayUs - STEPPER_STEP_US);
    updateStepperSettingsText();

    const box = document.getElementById("stepperStatus");
    if (box) box.textContent = `Speed increased. Delay is now ${stepperDelayUs} us. Lower delay = faster motor.`;
}

function stepperSlower() {
    stepperDelayUs = Math.min(STEPPER_MAX_DELAY_US, stepperDelayUs + STEPPER_STEP_US);
    updateStepperSettingsText();

    const box = document.getElementById("stepperStatus");
    if (box) box.textContent = `Speed reduced. Delay is now ${stepperDelayUs} us. Higher delay = slower but stronger.`;
}

function stepperResetDefault() {
    stepperDelayUs = STEPPER_DEFAULT_DELAY_US;
    stepperDurationS = STEPPER_DEFAULT_DURATION_S;
    updateStepperSettingsText();

    const box = document.getElementById("stepperStatus");
    if (box) box.textContent = "Default restored: 10000 us, 3 seconds.";
}

function disabledStepperNotice(motor) {
    const box = document.getElementById("stepperStatus");
    if (box) {
        box.textContent = `Motor ${motor} is not ready yet. It is disabled until the P3 wiring issue is isolated.`;
    }
}

async function runStepperTest(motor, reverse=false) {
    updateStepperSettingsText();

    const box = document.getElementById("stepperStatus");
    if (box) {
        box.textContent = `Running Motor ${motor}${reverse ? " reverse" : ""} at ${stepperDelayUs} us...`;
    }

    try {
        const res = await fetch("/api/hardware/stepper-test", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                motor: motor,
                duration_s: stepperDurationS,
                delay_us: stepperDelayUs,
                reverse: reverse
            })
        });

        const data = await res.json();

        if (box) {
            if (data.success) {
                box.textContent = `OK: Motor ${data.motor} ran. Steps: ${data.steps_executed}. Delay: ${data.delay_us} us. ${data.reverse ? "Reverse" : "Forward"}.`;
            } else {
                box.textContent = `ERROR: ${data.error || "Stepper test failed"}`;
            }
        }

    } catch (e) {
        if (box) box.textContent = "ERROR: Stepper API not reachable.";
    }
}

async function stepperAllOff() {
    const box = document.getElementById("stepperStatus");
    if (box) box.textContent = "Sending all-off command...";

    try {
        const res = await fetch("/api/hardware/stepper-off", {method: "POST"});
        const data = await res.json();

        if (box) {
            box.textContent = data.success ? "All stepper outputs OFF." : "All-off failed.";
        }

    } catch (e) {
        if (box) box.textContent = "ERROR: Stepper API not reachable.";
    }
}

window.runStepperTest = runStepperTest;
window.stepperAllOff = stepperAllOff;
window.stepperFaster = stepperFaster;
window.stepperSlower = stepperSlower;
window.stepperResetDefault = stepperResetDefault;
window.disabledStepperNotice = disabledStepperNotice;
