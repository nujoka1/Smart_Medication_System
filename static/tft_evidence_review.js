/*
MedSystem TFT Evidence Review
Shows latest captured dose evidence records for caretaker/admin review.
*/

(function initEvidenceReview() {
    injectEvidenceCSS();
    injectEvidenceScreen();
    patchSettingsEvidenceButton();

    setTimeout(patchSettingsEvidenceButton, 1200);
    setInterval(patchSettingsEvidenceButton, 3000);
})();

function injectEvidenceCSS() {
    if (document.getElementById("evidence-review-css")) return;

    const style = document.createElement("style");
    style.id = "evidence-review-css";
    style.textContent = `
        .evidence-list {
            height: 208px;
            overflow-y: auto;
            overflow-x: hidden;
            padding-right: 8px;
            touch-action: pan-y;
        }

        .evidence-list::-webkit-scrollbar {
            width: 20px;
        }

        .evidence-list::-webkit-scrollbar-track {
            background: #100d20;
            border-radius: 20px;
        }

        .evidence-list::-webkit-scrollbar-thumb {
            background: linear-gradient(#a855f7, #00c853);
            border-radius: 20px;
            border: 3px solid #100d20;
        }

        .ev-item {
            background: #100d20;
            border: 1px solid #332552;
            border-radius: 12px;
            padding: 7px 9px;
            margin-bottom: 7px;
        }

        .ev-main {
            font-size: 15px;
            font-weight: 900;
            color: #ffffff;
            line-height: 1.2;
        }

        .ev-sub {
            font-size: 11px;
            color: #b9aecf;
            margin-top: 2px;
            line-height: 1.25;
        }

        .ev-ok {
            color: #18e179;
            font-weight: 900;
        }

        .ev-warn {
            color: #f59e0b;
            font-weight: 900;
        }

        .ev-bad {
            color: #ef4444;
            font-weight: 900;
        }

        .ev-pill {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 999px;
            font-size: 10px;
            font-weight: 900;
            margin-left: 4px;
        }

        .ev-ai {
            color: #c084fc;
            background: rgba(168, 85, 247, 0.18);
            border: 1px solid rgba(168, 85, 247, 0.45);
        }

        .ev-custom {
            color: #18e179;
            background: rgba(0, 200, 83, 0.16);
            border: 1px solid rgba(0, 200, 83, 0.45);
        }
    `;
    document.head.appendChild(style);
}

function injectEvidenceScreen() {
    if (document.getElementById("evidence-review")) return;

    const wrap = document.createElement("div");
    wrap.innerHTML = `
        <div id="evidence-review" class="screen">
            <div class="header">
                <div class="title">EVIDENCE</div>
                <div class="time"></div>
            </div>

            <div class="evidence-list" id="evidenceList">
                <div class="ev-item">
                    <div class="ev-main">Loading evidence...</div>
                    <div class="ev-sub">Please wait</div>
                </div>
            </div>

            <div class="bottom three compact-bottom">
                <button class="btn-dark" onclick="showScreen('settings')">Back</button>
                <button class="btn-purple" onclick="loadEvidenceReview()">Refresh</button>
                <button class="btn-green" onclick="showScreen('home')">Home</button>
            </div>
        </div>
    `;

    document.body.appendChild(wrap);
}

function patchSettingsEvidenceButton() {
    const settings = document.getElementById("settings");
    if (!settings) return;

    const buttons = settings.querySelectorAll(".menu-grid button");
    if (!buttons || buttons.length < 4) return;

    buttons[3].onclick = function () {
        loadEvidenceReview();
        showScreen("evidence-review");
    };

    const title = buttons[3].querySelector(".m-title");
    const sub = buttons[3].querySelector(".m-sub");

    if (title) title.textContent = "Evidence";
    if (sub) sub.textContent = "Dose images and AI result";
}

function evidenceDecisionClass(decision) {
    if (decision === "VERIFIED_AI" || decision === "CUSTOM_COUNT_CAMERA") {
        return "ev-ok";
    }

    if (decision === "AI_UNCERTAIN_REVIEW") {
        return "ev-warn";
    }

    return "ev-bad";
}

function evidenceModeBadge(item) {
    if (item.expected_ai_class && item.expected_ai_class !== "custom") {
        return '<span class="ev-pill ev-ai">AI</span>';
    }

    return '<span class="ev-pill ev-custom">CUSTOM</span>';
}

async function loadEvidenceReview() {
    const box = document.getElementById("evidenceList");
    if (!box) return;

    box.innerHTML = `
        <div class="ev-item">
            <div class="ev-main">Loading evidence...</div>
            <div class="ev-sub">Please wait</div>
        </div>
    `;

    try {
        const res = await fetch("/api/evidence/latest?limit=20");
        const rows = await res.json();

        if (!rows || rows.length === 0) {
            box.innerHTML = `
                <div class="ev-item">
                    <div class="ev-main">No evidence captured yet</div>
                    <div class="ev-sub">Evidence appears after camera + AI capture</div>
                </div>
            `;
            return;
        }

        box.innerHTML = rows.map((item, index) => {
            const model = item.model_result || {};
            const decision = item.decision || "UNKNOWN";
            const cls = evidenceDecisionClass(decision);

            let conf = "N/A";
            if (model.confidence !== null && model.confidence !== undefined) {
                try {
                    conf = (Number(model.confidence) * 100).toFixed(1) + "%";
                } catch (e) {
                    conf = String(model.confidence);
                }
            }

            return `
                <div class="ev-item">
                    <div class="ev-main">
                        ${index + 1}. ${item.expected_name || "Medication"}
                        ${evidenceModeBadge(item)}
                    </div>
                    <div class="ev-sub">
                        Decision: <span class="${cls}">${decision}</span>
                    </div>
                    <div class="ev-sub">
                        AI observed: ${model.detected_class || "N/A"} • ${conf}
                    </div>
                    <div class="ev-sub">
                        Count: ${item.ir_actual_count ?? "--"}/${item.ir_target_count ?? "--"} • ${item.created_at || ""}
                    </div>
                </div>
            `;
        }).join("");

    } catch (e) {
        box.innerHTML = `
            <div class="ev-item">
                <div class="ev-main"><span class="ev-bad">Evidence load failed</span></div>
                <div class="ev-sub">Check API service</div>
            </div>
        `;
    }
}
