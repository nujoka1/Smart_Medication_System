/*
MedSystem TFT Hardware Diagnostics v2
Cleaner display for I2C expanders, services, CPU temperature and IR raw value.
Safe status page only. No motor movement.
*/

(function initHardwareStatus() {
    injectHardwareCSS();
    injectHardwareScreen();
    patchSettingsHardwareButton();
})();

function injectHardwareCSS() {
    if (document.getElementById("hardware-status-css")) return;

    const style = document.createElement("style");
    style.id = "hardware-status-css";
    style.textContent = `
        .hw-list {
            height: 208px;
            overflow-y: auto;
            overflow-x: hidden;
            padding-right: 8px;
            touch-action: pan-y;
        }

        .hw-list::-webkit-scrollbar {
            width: 20px;
        }

        .hw-list::-webkit-scrollbar-track {
            background: #100d20;
            border-radius: 20px;
        }

        .hw-list::-webkit-scrollbar-thumb {
            background: linear-gradient(#a855f7, #00c853);
            border-radius: 20px;
            border: 3px solid #100d20;
        }

        .hw-section-title {
            font-size: 12px;
            font-weight: 900;
            color: #a855f7;
            margin: 8px 0 5px 2px;
            letter-spacing: 0.8px;
        }

        .hw-item {
            background: #100d20;
            border: 1px solid #332552;
            border-radius: 11px;
            padding: 7px 9px;
            margin-bottom: 6px;
        }

        .hw-main {
            font-size: 15px;
            font-weight: 900;
            color: #ffffff;
        }

        .hw-sub {
            font-size: 11px;
            color: #b9aecf;
            margin-top: 2px;
        }

        .hw-ok {
            color: #18e179;
            font-weight: 900;
        }

        .hw-bad {
            color: #ef4444;
            font-weight: 900;
        }

        .hw-code {
            color: #18e179;
            font-weight: 900;
        }
    `;
    document.head.appendChild(style);
}

function injectHardwareScreen() {
    if (document.getElementById("hardware-status")) return;

    const wrap = document.createElement("div");
    wrap.innerHTML = `
        <div id="hardware-status" class="screen">
            <div class="header">
                <div class="title">HARDWARE</div>
                <div class="time"></div>
            </div>

            <div class="hw-list" id="hardwareStatusList">
                <div class="hw-item">
                    <div class="hw-main">Loading hardware status...</div>
                    <div class="hw-sub">Please wait</div>
                </div>
            </div>

            <div class="bottom three compact-bottom">
                <button class="btn-dark" onclick="showScreen('settings')">Back</button>
                <button class="btn-purple" onclick="loadHardwareStatus()">Refresh</button>
                <button class="btn-green" onclick="showScreen('home')">Home</button>
            </div>
        </div>
    `;

    document.body.appendChild(wrap);
}

function patchSettingsHardwareButton() {
    setTimeout(() => {
        const settings = document.getElementById("settings");
        if (!settings) return;

        const buttons = settings.querySelectorAll("button");
        if (!buttons || buttons.length < 1) return;

        buttons[0].onclick = function () {
            loadHardwareStatus();
            showScreen("hardware-status");
        };

        const title = buttons[0].querySelector(".m-title");
        const sub = buttons[0].querySelector(".m-sub");

        if (title) title.textContent = "Hardware";
        if (sub) sub.textContent = "I2C, IR, services, CPU";
    }, 1000);
}

function shortServiceName(name) {
    return name
        .replace(".service", "")
        .replace("medsystem-api", "medsystem-api")
        .replace("medsystem-tft", "medsystem-tft");
}

async function loadHardwareStatus() {
    const box = document.getElementById("hardwareStatusList");
    if (!box) return;

    box.innerHTML = `
        <div class="hw-item">
            <div class="hw-main">Loading hardware status...</div>
            <div class="hw-sub">Please wait</div>
        </div>
    `;

    try {
        const res = await fetch("/api/hardware/status");
        const data = await res.json();

        let html = "";

        html += `
            <div class="hw-section-title">SYSTEM</div>
            <div class="hw-item">
                <div class="hw-main">System: ${data.ok ? '<span class="hw-ok">OK</span>' : '<span class="hw-bad">CHECK</span>'}</div>
                <div class="hw-sub">CPU Temperature: <span class="hw-code">${data.cpu_temp || '--'}</span></div>
                <div class="hw-sub">IR Raw Value: <span class="hw-code">${data.ir_raw || '--'}</span></div>
            </div>
        `;

        html += `<div class="hw-section-title">I2C DEVICES</div>`;

        const order = ["0x23", "0x25", "0x26", "0x27"];

        order.forEach(addr => {
            if (!data.i2c || !data.i2c[addr]) return;

            const dev = data.i2c[addr];
            html += `
                <div class="hw-item">
                    <div class="hw-main">
                        ${addr} ${dev.present ? '<span class="hw-ok">FOUND</span>' : '<span class="hw-bad">MISSING</span>'}
                    </div>
                    <div class="hw-sub">${dev.label || ''}</div>
                    <div class="hw-sub">RAW: <span class="hw-code">${dev.raw || '--'}</span></div>
                </div>
            `;
        });

        html += `<div class="hw-section-title">SERVICES</div>`;

        if (data.services) {
            Object.keys(data.services).forEach(name => {
                const state = data.services[name];
                const good = state === "active";

                html += `
                    <div class="hw-item">
                        <div class="hw-main">
                            ${shortServiceName(name)} ${good ? '<span class="hw-ok">ACTIVE</span>' : '<span class="hw-bad">' + state.toUpperCase() + '</span>'}
                        </div>
                        <div class="hw-sub">systemd service status</div>
                    </div>
                `;
            });
        }

        box.innerHTML = html;

    } catch (e) {
        box.innerHTML = `
            <div class="hw-item">
                <div class="hw-main"><span class="hw-bad">Hardware status failed</span></div>
                <div class="hw-sub">Check API service</div>
            </div>
        `;
    }
}
