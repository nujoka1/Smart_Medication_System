/*
MedSystem TFT Medication Setup v2
- Scrollable pages with large TFT-friendly scrollbar
- AI supported medication dropdown/list
- Registered medication option
- "My medication is not listed" option
- Improved save success flow
*/

let aiClassList = [];
let medSetupPatients = [];
let medSetupMeds = [];

let selectedMode = "ai";
let selectedAiClass = null;
let selectedMedName = "";
let selectedMedicationId = null;

let selectedCompartment = 1;
let selectedStock = 30;
let selectedDoseQty = 1;
let selectedHour = 8;
let selectedMinute = 0;

(function initMedSetupModule() {
    injectMedSetupCSS();
    injectMedSetupScreens();

    window.openSetup = openMedicationSetup;
    window.openMedicationSetup = openMedicationSetup;

    setTimeout(() => {
        document.querySelectorAll("button").forEach(btn => {
            const txt = (btn.textContent || "").trim().toLowerCase();
            if (txt.includes("add alarm") || txt.includes("add / edit")) {
                btn.onclick = openMedicationSetup;
            }
        });
    }, 1000);
})();

function injectMedSetupCSS() {
    if (document.getElementById("medsetup-css")) return;

    const style = document.createElement("style");
    style.id = "medsetup-css";
    style.textContent = `
        .scroll-area {
            height: 212px;
            overflow-y: auto;
            overflow-x: hidden;
            padding-right: 8px;
            touch-action: pan-y;
        }

        .scroll-area::-webkit-scrollbar {
            width: 20px;
        }

        .scroll-area::-webkit-scrollbar-track {
            background: #100d20;
            border-radius: 20px;
        }

        .scroll-area::-webkit-scrollbar-thumb {
            background: linear-gradient(#a855f7, #00c853);
            border-radius: 20px;
            border: 3px solid #100d20;
        }

        .compact-bottom {
            bottom: 6px !important;
            gap: 6px !important;
        }

        .compact-bottom button {
            height: 46px !important;
            font-size: 14px !important;
            border-radius: 12px !important;
        }

        .choice-card {
            width: 100%;
            min-height: 58px;
            margin-bottom: 8px;
            background: #151128;
            border: 1px solid #332552;
            border-radius: 14px;
            color: #fff;
            text-align: left;
            padding: 9px 10px;
        }

        .choice-title {
            font-size: 17px;
            font-weight: 900;
        }

        .choice-sub {
            font-size: 12px;
            color: #b9aecf;
            margin-top: 3px;
            line-height: 1.25;
        }

        .choice-green {
            border-color: rgba(0, 200, 83, 0.5);
            background: #0f2d22;
        }

        .choice-purple {
            border-color: rgba(168, 85, 247, 0.6);
            background: #1b1233;
        }

        .select-box {
            width: 100%;
            height: 54px;
            background: #100d20;
            color: #ffffff;
            border: 2px solid #7c3aed;
            border-radius: 14px;
            font-size: 16px;
            font-weight: 800;
            padding: 0 8px;
        }

        .setup-card-small {
            background: #151128;
            border: 1px solid #332552;
            border-radius: 12px;
            padding: 8px;
            margin-bottom: 7px;
        }

        .setup-card-small .main {
            font-size: 18px;
            font-weight: 900;
            line-height: 1.12;
        }

        .setup-card-small .sub {
            font-size: 12px;
            color: #b9aecf;
            margin-top: 3px;
        }

        .setup-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 7px;
        }

        .setup-control {
            background: #100d20;
            border: 1px solid #332552;
            border-radius: 12px;
            padding: 6px;
            min-height: 74px;
        }

        .setup-control .name {
            font-size: 10px;
            color: #b9aecf;
            text-transform: uppercase;
        }

        .setup-control .value {
            font-size: 22px;
            font-weight: 900;
            color: #18e179;
            margin: 2px 0;
        }

        .tiny-btns {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 5px;
        }

        .tiny-btns button {
            height: 28px;
            border-radius: 9px;
            font-size: 15px;
        }

        .mode-note {
            font-size: 13px;
            color: #b9aecf;
            line-height: 1.35;
        }

        .success-big {
            font-size: 23px;
            font-weight: 900;
            color: #18e179;
            margin-bottom: 8px;
        }
    `;
    document.head.appendChild(style);
}

function injectMedSetupScreens() {
    if (document.getElementById("med-source")) return;

    const screens = document.createElement("div");
    screens.innerHTML = `
        <!-- MEDICATION SOURCE -->
        <div id="med-source" class="screen">
            <div class="header">
                <div class="title">ADD ALARM</div>
                <div class="time"></div>
            </div>

            <div class="scroll-area">
                <button class="choice-card choice-purple" onclick="showScreen('ai-dropdown-screen')">
                    <div class="choice-title">Select AI-supported drug</div>
                    <div class="choice-sub">Choose from trained medication list. Verification: AI + camera + pill count.</div>
                </button>

                <button class="choice-card" onclick="openRegisteredMedicationList()">
                    <div class="choice-title">Use registered medication</div>
                    <div class="choice-sub">Use a drug already saved with compartment and stock information.</div>
                </button>

                <button class="choice-card choice-green" onclick="showScreen('custom-med-notice')">
                    <div class="choice-title">My medication is not listed</div>
                    <div class="choice-sub">Use compartment, pill count sensor and camera record. AI is skipped.</div>
                </button>
            </div>

            <div class="bottom compact-bottom">
                <button class="btn-dark" onclick="showScreen('menu')">Back</button>
                <button class="btn-green" onclick="loadData()">Refresh</button>
            </div>
        </div>

        <!-- AI DROPDOWN SCREEN -->
        <div id="ai-dropdown-screen" class="screen">
            <div class="header">
                <div class="title">AI DRUG LIST</div>
                <div class="time"></div>
            </div>

            <div class="scroll-area">
                <div class="setup-card-small">
                    <div class="label">Select medication</div>
                    <select id="aiClassDropdown" class="select-box"></select>
                    <div class="sub">The selected drug will support AI verification.</div>
                </div>

                <button class="choice-card choice-green" onclick="showScreen('custom-med-notice')">
                    <div class="choice-title">My medication is not listed</div>
                    <div class="choice-sub">Continue as custom medication. AI verification will be skipped.</div>
                </button>
            </div>

            <div class="bottom compact-bottom">
                <button class="btn-dark" onclick="showScreen('med-source')">Back</button>
                <button class="btn-green" onclick="selectAiMedicationFromDropdown()">Continue</button>
            </div>
        </div>

        <!-- REGISTERED MEDICATION LIST -->
        <div id="registered-med-screen" class="screen">
            <div class="header">
                <div class="title">REGISTERED MEDS</div>
                <div class="time"></div>
            </div>

            <div class="scroll-area" id="registeredMedList">
                <div class="setup-card-small">
                    <div class="main">Loading medications...</div>
                    <div class="sub">Please wait</div>
                </div>
            </div>

            <div class="bottom compact-bottom">
                <button class="btn-dark" onclick="showScreen('med-source')">Back</button>
                <button class="btn-purple" onclick="showScreen('ai-dropdown-screen')">AI List</button>
            </div>
        </div>

        <!-- CUSTOM MEDICATION NOTICE -->
        <div id="custom-med-notice" class="screen">
            <div class="header">
                <div class="title">CUSTOM MEDICATION</div>
                <div class="time"></div>
            </div>

            <div class="scroll-area">
                <div class="card">
                    <div class="label">AI VERIFICATION</div>
                    <div class="big" style="font-size:21px;">Medicine not in AI list</div>
                    <div class="mode-note" style="margin-top:8px;">
                        The system will still dispense using the selected compartment,
                        count pills with the IR sensor, and save a camera record.
                        AI verification will be skipped.
                    </div>
                </div>
            </div>

            <div class="bottom compact-bottom">
                <button class="btn-dark" onclick="showScreen('med-source')">Back</button>
                <button class="btn-green" onclick="selectCustomMedication()">Continue</button>
            </div>
        </div>

        <!-- MEDICATION SETUP -->
        <div id="med-setup" class="screen">
            <div class="header">
                <div class="title">SET ALARM</div>
                <div class="time"></div>
            </div>

            <div class="scroll-area" style="height:224px;">
                <div class="setup-card-small">
                    <div class="label" id="medSetupModeLabel">AI SUPPORTED</div>
                    <div class="main" id="medSetupName">Medication</div>
                    <div class="sub" id="medSetupDesc">AI + camera + pill count</div>
                </div>

                <div class="setup-grid">
                    <div class="setup-control">
                        <div class="name">Hour</div>
                        <div class="value" id="msHour">08</div>
                        <div class="tiny-btns">
                            <button class="btn-dark" onclick="adjustMS('hour', -1)">−</button>
                            <button class="btn-purple" onclick="adjustMS('hour', 1)">+</button>
                        </div>
                    </div>

                    <div class="setup-control">
                        <div class="name">Minute</div>
                        <div class="value" id="msMinute">00</div>
                        <div class="tiny-btns">
                            <button class="btn-dark" onclick="adjustMS('minute', -5)">−</button>
                            <button class="btn-purple" onclick="adjustMS('minute', 5)">+</button>
                        </div>
                    </div>

                    <div class="setup-control">
                        <div class="name">Qty</div>
                        <div class="value" id="msQty">1</div>
                        <div class="tiny-btns">
                            <button class="btn-dark" onclick="adjustMS('qty', -1)">−</button>
                            <button class="btn-purple" onclick="adjustMS('qty', 1)">+</button>
                        </div>
                    </div>

                    <div class="setup-control">
                        <div class="name">Compartment</div>
                        <div class="value" id="msComp">1</div>
                        <div class="tiny-btns">
                            <button class="btn-dark" onclick="adjustMS('comp', -1)">−</button>
                            <button class="btn-purple" onclick="adjustMS('comp', 1)">+</button>
                        </div>
                    </div>

                    <div class="setup-control">
                        <div class="name">Stock</div>
                        <div class="value" id="msStock">30</div>
                        <div class="tiny-btns">
                            <button class="btn-dark" onclick="adjustMS('stock', -5)">−</button>
                            <button class="btn-purple" onclick="adjustMS('stock', 5)">+</button>
                        </div>
                    </div>

                    <div class="setup-control">
                        <div class="name">Days</div>
                        <div class="value" style="font-size:17px;">Daily</div>
                        <div class="name">All week</div>
                    </div>
                </div>
            </div>

            <div class="bottom three compact-bottom">
                <button class="btn-dark" onclick="showScreen('med-source')">Back</button>
                <button class="btn-purple" onclick="showScreen('menu')">Cancel</button>
                <button class="btn-green" onclick="saveMedSetup()">Save</button>
            </div>
        </div>

        <!-- SAVE SUCCESS -->
        <div id="save-success" class="screen">
            <div class="header">
                <div class="title">SAVED</div>
                <div class="time"></div>
            </div>

            <div class="center">
                <div>
                    <div class="success-big" id="saveSuccessTitle">Medication saved</div>
                    <div class="sub" id="saveSuccessText">Alarm has been added successfully.</div>
                </div>
            </div>

            <div class="bottom three compact-bottom">
                <button class="btn-purple" onclick="openMedicationSetup()">Register Another</button>
                <button class="btn-dark" onclick="showScreen('schedule')">Schedule</button>
                <button class="btn-green" onclick="showScreen('home')">Home</button>
            </div>
        </div>
    `;

    document.body.appendChild(screens);
}

async function openMedicationSetup() {
    try {
        const [classesRes, patientsRes, medsRes] = await Promise.all([
            fetch("/api/ai/classes"),
            fetch("/api/patients"),
            fetch("/api/medications")
        ]);

        aiClassList = await classesRes.json();
        medSetupPatients = await patientsRes.json();
        medSetupMeds = await medsRes.json();

        if (!medSetupPatients || medSetupPatients.length === 0) {
            showMessage("No patient found. Add patient first.");
            return;
        }

        renderAiDropdown();
        showScreen("med-source");

    } catch (e) {
        showMessage("Cannot load medication setup data.");
    }
}

function renderAiDropdown() {
    const select = document.getElementById("aiClassDropdown");
    if (!select) return;

    select.innerHTML = aiClassList.map((item, index) => {
        return `<option value="${index}">${item.label}</option>`;
    }).join("");
}

function openRegisteredMedicationList() {
    const box = document.getElementById("registeredMedList");

    if (!medSetupMeds || medSetupMeds.length === 0) {
        box.innerHTML = `
            <div class="setup-card-small">
                <div class="main">No registered medication</div>
                <div class="sub">Use AI list or custom medication first.</div>
            </div>
        `;
        showScreen("registered-med-screen");
        return;
    }

    box.innerHTML = medSetupMeds.map((m, index) => {
        const mode = (m.ai_class && m.ai_class !== "custom") ? "AI supported" : "Custom / count only";
        return `
            <button class="choice-card" onclick="selectRegisteredMedication(${index})">
                <div class="choice-title">${m.name || "Medication"}</div>
                <div class="choice-sub">${mode} • Stock ${m.stock ?? "--"} • Compartment ${m.compartment ?? "-"}</div>
            </button>
        `;
    }).join("");

    showScreen("registered-med-screen");
}

function selectRegisteredMedication(index) {
    const med = medSetupMeds[index];
    if (!med) return;

    selectedMode = (med.ai_class && med.ai_class !== "custom") ? "registered_ai" : "registered_custom";
    selectedAiClass = med.ai_class || "custom";
    selectedMedName = med.name || "Medication";
    selectedMedicationId = med.id;

    selectedCompartment = Number(med.compartment ?? 1);
    selectedStock = Number(med.stock ?? 30);
    selectedDoseQty = 1;

    updateMedSetupScreen();
    showScreen("med-setup");
}

function selectAiMedicationFromDropdown() {
    const select = document.getElementById("aiClassDropdown");
    const index = Number(select.value);
    const item = aiClassList[index];

    if (!item) {
        showMessage("No AI medication selected.");
        return;
    }

    selectedMode = "ai";
    selectedAiClass = item.ai_class;
    selectedMedName = item.label;
    selectedMedicationId = null;

    selectedCompartment = 1;
    selectedStock = 30;
    selectedDoseQty = 1;

    updateMedSetupScreen();
    showScreen("med-setup");
}

function selectCustomMedication() {
    selectedMode = "custom";
    selectedAiClass = "custom";
    selectedMedName = "Custom Medication";
    selectedMedicationId = null;

    selectedCompartment = 1;
    selectedStock = 30;
    selectedDoseQty = 1;

    updateMedSetupScreen();
    showScreen("med-setup");
}

function updateMedSetupScreen() {
    document.getElementById("medSetupName").textContent = selectedMedName;

    if (selectedMode === "ai" || selectedMode === "registered_ai") {
        document.getElementById("medSetupModeLabel").textContent = "AI SUPPORTED";
        document.getElementById("medSetupDesc").textContent = "AI + camera + pill count";
    } else {
        document.getElementById("medSetupModeLabel").textContent = "CUSTOM / COUNT ONLY";
        document.getElementById("medSetupDesc").textContent = "AI skipped • camera record saved";
    }

    document.getElementById("msHour").textContent = String(selectedHour).padStart(2, "0");
    document.getElementById("msMinute").textContent = String(selectedMinute).padStart(2, "0");
    document.getElementById("msQty").textContent = selectedDoseQty;
    document.getElementById("msComp").textContent = selectedCompartment;
    document.getElementById("msStock").textContent = selectedStock;
}

function adjustMS(field, delta) {
    if (field === "hour") selectedHour = (selectedHour + delta + 24) % 24;
    if (field === "minute") selectedMinute = (selectedMinute + delta + 60) % 60;
    if (field === "qty") selectedDoseQty = Math.max(1, Math.min(10, selectedDoseQty + delta));
    if (field === "comp") selectedCompartment = Math.max(1, Math.min(6, selectedCompartment + delta));
    if (field === "stock") selectedStock = Math.max(0, Math.min(999, selectedStock + delta));

    updateMedSetupScreen();
}

async function saveMedSetup() {
    if (!medSetupPatients || medSetupPatients.length === 0) {
        showMessage("No patient available.");
        return;
    }

    const patient = medSetupPatients[0];
    const doseTime = `${String(selectedHour).padStart(2, "0")}:${String(selectedMinute).padStart(2, "0")}`;

    try {
        let medId = selectedMedicationId;

        if (!medId) {
            const medPayload = {
                name: selectedMedName,
                ai_class_name: selectedMode === "ai" ? selectedAiClass : "custom",
                compartment: selectedCompartment,
                stock_count: selectedStock,
                low_stock_alert: 5,
                dose_mg: 0,
                weight_per_pill: 0.5
            };

            const medRes = await fetch("/api/medications", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(medPayload)
            });

            const medData = await medRes.json();

            if (!medRes.ok) {
                showMessage(medData.error || "Could not save medication.");
                return;
            }

            medId = medData.id;
        }

        const schedulePayload = {
            patient_id: patient.id,
            medication_id: medId,
            dose_time: doseTime,
            dose_quantity: selectedDoseQty,
            compartment: selectedCompartment,
            days_of_week: "0123456"
        };

        const schRes = await fetch("/api/schedule", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(schedulePayload)
        });

        const schData = await schRes.json();

        if (!schRes.ok) {
            showMessage(schData.error || "Could not save schedule.");
            return;
        }

        await loadData();

        document.getElementById("saveSuccessTitle").textContent = "Alarm saved";
        document.getElementById("saveSuccessText").textContent =
            `${selectedMedName} • ${doseTime} • Qty ${selectedDoseQty}`;

        showScreen("save-success");

    } catch (e) {
        showMessage("API error while saving medication.");
    }
}
