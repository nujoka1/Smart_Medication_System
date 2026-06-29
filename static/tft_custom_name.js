/*
MedSystem TFT Custom Medication Name Input
Overrides selectCustomMedication() from tft_med_setup.js.
*/

let customNameBuffer = "";

(function initCustomNameModule() {
    injectCustomNameCSS();
    injectCustomNameScreen();

    // Override existing function
    window.selectCustomMedication = openCustomNameScreen;
})();

function injectCustomNameCSS() {
    if (document.getElementById("custom-name-css")) return;

    const style = document.createElement("style");
    style.id = "custom-name-css";
    style.textContent = `
        .custom-name-display {
            height: 46px;
            background: #100d20;
            border: 2px solid #00c853;
            border-radius: 14px;
            color: #ffffff;
            font-size: 20px;
            font-weight: 900;
            padding: 10px;
            margin-bottom: 8px;
            overflow: hidden;
            white-space: nowrap;
        }

        .keyboard-area {
            height: 148px;
            overflow-y: auto;
            overflow-x: hidden;
            padding-right: 8px;
            touch-action: pan-y;
        }

        .keyboard-area::-webkit-scrollbar {
            width: 20px;
        }

        .keyboard-area::-webkit-scrollbar-track {
            background: #100d20;
            border-radius: 20px;
        }

        .keyboard-area::-webkit-scrollbar-thumb {
            background: linear-gradient(#a855f7, #00c853);
            border-radius: 20px;
            border: 3px solid #100d20;
        }

        .key-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 6px;
        }

        .key-grid button {
            height: 42px;
            font-size: 15px;
            border-radius: 11px;
        }

        .preset-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 7px;
            margin-bottom: 8px;
        }

        .preset-grid button {
            height: 42px;
            font-size: 13px;
            border-radius: 11px;
        }
    `;
    document.head.appendChild(style);
}

function injectCustomNameScreen() {
    if (document.getElementById("custom-name-screen")) return;

    const wrap = document.createElement("div");
    wrap.innerHTML = `
        <div id="custom-name-screen" class="screen">
            <div class="header">
                <div class="title">CUSTOM NAME</div>
                <div class="time"></div>
            </div>

            <div class="custom-name-display" id="customNameDisplay">TYPE NAME</div>

            <div class="preset-grid">
                <button class="btn-purple" onclick="setPresetCustomName('PARACETAMOL')">Paracetamol</button>
                <button class="btn-purple" onclick="setPresetCustomName('VITAMIN')">Vitamin</button>
                <button class="btn-purple" onclick="setPresetCustomName('BP DRUG')">BP Drug</button>
                <button class="btn-purple" onclick="setPresetCustomName('MALARIA TAB')">Malaria Tab</button>
            </div>

            <div class="keyboard-area">
                <div class="key-grid" id="customKeyboard"></div>
            </div>

            <div class="bottom three compact-bottom">
                <button class="btn-dark" onclick="showScreen('custom-med-notice')">Back</button>
                <button class="btn-red" onclick="clearCustomName()">Clear</button>
                <button class="btn-green" onclick="finishCustomName()">Continue</button>
            </div>
        </div>
    `;

    document.body.appendChild(wrap);
    buildCustomKeyboard();
}

function buildCustomKeyboard() {
    const keys = [
        "A","B","C","D","E",
        "F","G","H","I","J",
        "K","L","M","N","O",
        "P","Q","R","S","T",
        "U","V","W","X","Y",
        "Z","0","1","2","3",
        "4","5","6","7","8",
        "9","MG","TAB","SPACE","DEL"
    ];

    const box = document.getElementById("customKeyboard");
    box.innerHTML = keys.map(k => {
        if (k === "SPACE") {
            return `<button class="btn-dark" onclick="addCustomKey(' ')">SPACE</button>`;
        }
        if (k === "DEL") {
            return `<button class="btn-red" onclick="deleteCustomKey()">DEL</button>`;
        }
        return `<button class="btn-dark" onclick="addCustomKey('${k}')">${k}</button>`;
    }).join("");
}

function openCustomNameScreen() {
    customNameBuffer = "";
    updateCustomNameDisplay();
    showScreen("custom-name-screen");
}

function setPresetCustomName(name) {
    customNameBuffer = name;
    updateCustomNameDisplay();
}

function addCustomKey(k) {
    if (customNameBuffer.length >= 24) return;

    if (k === "MG") {
        customNameBuffer += " MG";
    } else if (k === "TAB") {
        customNameBuffer += " TAB";
    } else {
        customNameBuffer += k;
    }

    customNameBuffer = customNameBuffer.replace(/\s+/g, " ").trimStart();
    updateCustomNameDisplay();
}

function deleteCustomKey() {
    customNameBuffer = customNameBuffer.slice(0, -1);
    updateCustomNameDisplay();
}

function clearCustomName() {
    customNameBuffer = "";
    updateCustomNameDisplay();
}

function updateCustomNameDisplay() {
    const display = document.getElementById("customNameDisplay");
    if (!display) return;

    display.textContent = customNameBuffer.trim() || "TYPE NAME";
}

function finishCustomName() {
    const name = customNameBuffer.trim();

    if (!name) {
        showMessage("Enter medication name first.");
        return;
    }

    selectedMode = "custom";
    selectedAiClass = "custom";
    selectedMedName = name;
    selectedMedicationId = null;

    selectedCompartment = 1;
    selectedStock = 30;
    selectedDoseQty = 1;

    updateMedSetupScreen();
    showScreen("med-setup");
}
