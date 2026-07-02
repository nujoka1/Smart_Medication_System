/*
MedSystem TFT Buzzer Test
Supports PCF8574 0x23 P6 and Raspberry Pi GPIO27.
Safe test only.
*/

(function initBuzzerTest() {
    injectBuzzerCSS();
    injectBuzzerScreen();
    patchSettingsBuzzerButton();

    setTimeout(patchSettingsBuzzerButton, 1200);
    setInterval(patchSettingsBuzzerButton, 3000);
})();

function injectBuzzerCSS() {
    if (document.getElementById("buzzer-test-css")) return;

    const style = document.createElement("style");
    style.id = "buzzer-test-css";
    style.textContent = `
        .buzz-card {
            background: #100d20;
            border: 1px solid #332552;
            border-radius: 14px;
            padding: 10px;
            margin-bottom: 8px;
        }

        .buzz-title {
            font-size: 18px;
            font-weight: 900;
            color: #ffffff;
        }

        .buzz-sub {
            font-size: 12px;
            color: #b9aecf;
            margin-top: 4px;
            line-height: 1.3;
        }

        .buzz-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-top: 10px;
        }

        .buzz-grid button {
            height: 58px;
            font-size: 16px;
            border-radius: 14px;
        }

        .buzz-status {
            color: #18e179;
            font-size: 15px;
            font-weight: 900;
            margin-top: 8px;
        }
    `;
    document.head.appendChild(style);
}

function injectBuzzerScreen() {
    if (document.getElementById("buzzer-test")) return;

    const wrap = document.createElement("div");
    wrap.innerHTML = `
        <div id="buzzer-test" class="screen">
            <div class="header">
                <div class="title">BUZZER TEST</div>
                <div class="time"></div>
            </div>

            <div class="buzz-card">
                <div class="buzz-title">Select buzzer output</div>
                <div class="buzz-sub">
                    Use the button that matches your wiring. PCF P6 is on expander 0x23.
                    GPIO27 is Raspberry Pi BCM GPIO27 / physical pin 13.
                </div>

                <div class="buzz-grid">
                    <button class="btn-purple" onclick="testBuzzer('pcf')">Beep 0x23 P6</button>
                    <button class="btn-green" onclick="testBuzzer('gpio27')">Beep GPIO27</button>
                </div>

                <div class="buzz-status" id="buzzerStatus">Ready</div>
            </div>

            <div class="bottom three compact-bottom">
                <button class="btn-dark" onclick="showScreen('settings')">Back</button>
                <button class="btn-purple" onclick="testBuzzer('pcf')">PCF</button>
                <button class="btn-green" onclick="testBuzzer('gpio27')">GPIO</button>
            </div>
        </div>
    `;

    document.body.appendChild(wrap);
}

function patchSettingsBuzzerButton() {
    const settings = document.getElementById("settings");
    if (!settings) return;

    const buttons = settings.querySelectorAll(".menu-grid button");
    if (!buttons || buttons.length < 3) return;

    buttons[2].onclick = function () {
        showScreen("buzzer-test");
    };

    const title = buttons[2].querySelector(".m-title");
    const sub = buttons[2].querySelector(".m-sub");

    if (title) title.textContent = "Buzzer";
    if (sub) sub.textContent = "Alarm sound test";
}

async function testBuzzer(method) {
    const status = document.getElementById("buzzerStatus");
    if (status) status.textContent = "Testing...";

    try {
        const res = await fetch("/api/hardware/buzzer-test", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                method: method,
                duration_ms: 300
            })
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
            if (status) status.textContent = "Failed: " + (data.error || "No response");
            return;
        }

        if (status) {
            status.textContent = method === "pcf"
                ? "Beep sent to 0x23 P6"
                : "Beep sent to GPIO27";
        }

    } catch (e) {
        if (status) status.textContent = "API error";
    }
}
