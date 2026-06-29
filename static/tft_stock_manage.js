/*
MedSystem TFT Stock Manage
- Tap stock item
- View medication details
- Adjust stock count
- Save to backend
*/

let selectedStockMedication = null;
let selectedStockCount = 0;

(function initStockManage() {
    injectStockManageCSS();
    injectStockDetailScreen();

    window.renderStock = renderStockManage;
})();

function injectStockManageCSS() {
    if (document.getElementById("tft-stock-manage-css")) return;

    const style = document.createElement("style");
    style.id = "tft-stock-manage-css";
    style.textContent = `
        #stockList {
            height: 206px !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            padding-right: 8px !important;
            touch-action: pan-y !important;
        }

        #stockList::-webkit-scrollbar {
            width: 20px;
        }

        #stockList::-webkit-scrollbar-track {
            background: #100d20;
            border-radius: 20px;
        }

        #stockList::-webkit-scrollbar-thumb {
            background: linear-gradient(#a855f7, #00c853);
            border-radius: 20px;
            border: 3px solid #100d20;
        }

        .stock-click-item {
            cursor: pointer;
        }

        .stock-click-item:active {
            border-color: #00c853 !important;
            background: #13291f !important;
        }

        .stock-big-count {
            font-size: 42px;
            font-weight: 900;
            color: #18e179;
            line-height: 0.95;
        }

        .stock-control-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 6px;
            margin-top: 4px;
            margin-bottom: 52px;
        }

        .stock-control-grid button {
            height: 38px;
            font-size: 16px;
            border-radius: 11px;
        }

        #stock-detail .card {
            margin-bottom: 4px !important;
        }

        #stock-detail .center {
            margin-top: -4px !important;
            margin-bottom: 0 !important;
        }

        .stock-mode {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 999px;
            font-size: 10px;
            font-weight: 900;
            margin-left: 4px;
        }

        .stock-mode-ai {
            color: #c084fc;
            background: rgba(168, 85, 247, 0.18);
            border: 1px solid rgba(168, 85, 247, 0.45);
        }

        .stock-mode-custom {
            color: #18e179;
            background: rgba(0, 200, 83, 0.16);
            border: 1px solid rgba(0, 200, 83, 0.45);
        }
    `;
    document.head.appendChild(style);
}

function injectStockDetailScreen() {
    if (document.getElementById("stock-detail")) return;

    const wrap = document.createElement("div");
    wrap.innerHTML = `
        <div id="stock-detail" class="screen">
            <div class="header">
                <div class="title">UPDATE STOCK</div>
                <div class="time"></div>
            </div>

            <div class="card" style="height:72px;">
                <div class="label">Medication</div>
                <div class="big" id="stockDetailName" style="font-size:18px;">--</div>
                <div class="sub" id="stockDetailMeta">--</div>
            </div>

            <div class="center" style="height:68px;">
                <div>
                    <div class="label">PILLS LEFT</div>
                    <div class="stock-big-count" id="stockDetailCount">0</div>
                </div>
            </div>

            <div class="stock-control-grid">
                <button class="btn-dark" onclick="adjustStockCount(-1)">−1</button>
                <button class="btn-purple" onclick="adjustStockCount(10)">+10</button>
                <button class="btn-green" onclick="adjustStockCount(30)">+30</button>
            </div>

            <div class="bottom three compact-bottom">
                <button class="btn-dark" onclick="showScreen('stock')">Back</button>
                <button class="btn-red" onclick="setStockZero()">Set 0</button>
                <button class="btn-green" onclick="saveStockCount()">Save</button>
            </div>
        </div>
    `;

    document.body.appendChild(wrap);
}

function stockModeBadge(aiClass) {
    if (aiClass && aiClass !== "custom") {
        return '<span class="stock-mode stock-mode-ai">AI</span>';
    }
    return '<span class="stock-mode stock-mode-custom">COUNT</span>';
}

function renderStockManage(meds) {
    const box = document.getElementById('stockList');
    if (!box) return;

    if (!meds || meds.length === 0) {
        box.innerHTML = `
            <div class="item">
                <div class="item-main">No medication saved</div>
                <div class="item-sub">Add medication from TFT or dashboard</div>
            </div>
        `;
        return;
    }

    box.innerHTML = meds.map((m, index) => {
        const aiClass = m.ai_class || "custom";
        const modeText = aiClass !== "custom" ? "AI supported" : "Custom / count only";

        return `
            <div class="item stock-click-item" onclick="openStockDetail(${index})">
                <div class="item-main">
                    ${index + 1}. ${m.name || 'Medication'}
                    ${stockModeBadge(aiClass)}
                    ${statusBadge(m.stock)}
                </div>
                <div class="item-sub">
                    Stock: ${m.stock ?? '--'} • Comp: ${m.compartment ?? '-'} • ${modeText}
                </div>
            </div>
        `;
    }).join('');

    window.latestTFTMedications = meds;
}

function openStockDetail(index) {
    const meds = window.latestTFTMedications || [];
    const med = meds[index];

    if (!med) {
        showMessage("Medication not found.");
        return;
    }

    selectedStockMedication = med;
    selectedStockCount = Number(med.stock ?? 0);

    const aiClass = med.ai_class || "custom";
    const mode = aiClass !== "custom" ? "AI supported" : "Custom / count only";

    document.getElementById("stockDetailName").textContent = med.name || "Medication";
    document.getElementById("stockDetailMeta").textContent =
        `Compartment ${med.compartment ?? "-"} • ${mode}`;
    document.getElementById("stockDetailCount").textContent = selectedStockCount;

    showScreen("stock-detail");
}

function adjustStockCount(delta) {
    selectedStockCount = Math.max(0, Math.min(999, selectedStockCount + delta));
    document.getElementById("stockDetailCount").textContent = selectedStockCount;
}

function setStockZero() {
    selectedStockCount = 0;
    document.getElementById("stockDetailCount").textContent = selectedStockCount;
}

async function saveStockCount() {
    if (!selectedStockMedication || !selectedStockMedication.id) {
        showMessage("No medication selected.");
        return;
    }

    try {
        const res = await fetch(`/api/medications/${selectedStockMedication.id}/stock`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({stock_count: selectedStockCount})
        });

        const data = await res.json();

        if (!res.ok) {
            showMessage(data.error || "Could not update stock.");
            return;
        }

        await loadData();
        showMessage(`Stock updated: ${data.name} = ${data.stock}`);

    } catch (e) {
        showMessage("API error while updating stock.");
    }
}
