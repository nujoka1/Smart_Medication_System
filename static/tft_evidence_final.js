/*
MedSystem TFT Evidence Final
Self-contained evidence list + clickable annotated image viewer.
Keeps Evidence page simple, but every item opens the actual annotated image.
*/

let finalEvidenceRows = [];
let finalEvidenceSelected = null;
let finalEvidenceMode = "annotated";

(function initFinalEvidence() {
    injectFinalEvidenceCSS();
    buildFinalEvidenceScreens();

    setTimeout(patchEvidenceSettingsTile, 1000);
    setInterval(patchEvidenceSettingsTile, 3000);

    window.loadEvidenceReview = finalLoadEvidenceReview;
    window.openEvidenceDetail = finalOpenEvidenceImage;
})();

function injectFinalEvidenceCSS() {
    if (document.getElementById("final-evidence-css")) return;

    const style = document.createElement("style");
    style.id = "final-evidence-css";
    style.textContent = `
        .final-ev-list {
            height: 208px;
            overflow-y: auto;
            overflow-x: hidden;
            padding-right: 8px;
            touch-action: pan-y;
        }

        .final-ev-list::-webkit-scrollbar {
            width: 20px;
        }

        .final-ev-list::-webkit-scrollbar-track {
            background: #100d20;
            border-radius: 20px;
        }

        .final-ev-list::-webkit-scrollbar-thumb {
            background: linear-gradient(#a855f7, #00c853);
            border-radius: 20px;
            border: 3px solid #100d20;
        }

        .final-ev-item {
            background: #100d20;
            border: 1px solid #332552;
            border-radius: 12px;
            padding: 8px 9px;
            margin-bottom: 7px;
            min-height: 58px;
            cursor: pointer;
            pointer-events: auto;
        }

        .final-ev-item:active {
            border-color: #00c853;
            background: #13291f;
        }

        .final-ev-main {
            font-size: 15px;
            font-weight: 900;
            color: #ffffff;
            line-height: 1.2;
        }

        .final-ev-sub {
            font-size: 11px;
            color: #b9aecf;
            margin-top: 2px;
            line-height: 1.25;
        }

        .final-ev-ok { color: #18e179; font-weight: 900; }
        .final-ev-warn { color: #f59e0b; font-weight: 900; }
        .final-ev-bad { color: #ef4444; font-weight: 900; }

        .final-ev-pill {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 999px;
            font-size: 10px;
            font-weight: 900;
            margin-left: 4px;
        }

        .final-ev-ai {
            color: #c084fc;
            background: rgba(168, 85, 247, 0.18);
            border: 1px solid rgba(168, 85, 247, 0.45);
        }

        .final-ev-custom {
            color: #18e179;
            background: rgba(0, 200, 83, 0.16);
            border: 1px solid rgba(0, 200, 83, 0.45);
        }

        .final-ev-image-box {
            height: 214px;
            background: #05040d;
            border: 1px solid #332552;
            border-radius: 14px;
            padding: 6px;
            margin-bottom: 56px;
        }

        .final-ev-image {
            width: 100%;
            height: 166px;
            object-fit: contain;
            background: #000000;
            border-radius: 10px;
            border: 1px solid #332552;
        }

        .final-ev-caption {
            font-size: 12px;
            color: #ffffff;
            font-weight: 900;
            margin-top: 5px;
            line-height: 1.15;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .final-ev-meta {
            font-size: 10px;
            color: #b9aecf;
            margin-top: 2px;
            line-height: 1.15;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        #evidence-review .bottom,
        #evidence-final-image .bottom {
            z-index: 30000 !important;
            pointer-events: auto !important;
        }

        #evidence-review .bottom button,
        #evidence-final-image .bottom button {
            height: 48px !important;
            font-size: 14px !important;
            border-radius: 12px !important;
            pointer-events: auto !important;
        }
    `;
    document.head.appendChild(style);
}

function buildFinalEvidenceScreens() {
    // If the old Evidence page exists, reuse it but replace its list and buttons.
    let ev = document.getElementById("evidence-review");

    if (!ev) {
        const wrap = document.createElement("div");
        wrap.innerHTML = `
            <div id="evidence-review" class="screen">
                <div class="header">
                    <div class="title">EVIDENCE</div>
                    <div class="time"></div>
                </div>

                <div id="evidenceList" class="final-ev-list">
                    <div class="final-ev-item">
                        <div class="final-ev-main">Loading evidence...</div>
                        <div class="final-ev-sub">Please wait</div>
                    </div>
                </div>

                <div class="bottom three compact-bottom">
                    <button class="btn-dark" onclick="showScreen('settings')">Back</button>
                    <button class="btn-purple" onclick="finalLoadEvidenceReview()">Refresh</button>
                    <button class="btn-green" onclick="showScreen('home')">Home</button>
                </div>
            </div>
        `;
        document.body.appendChild(wrap);
    } else {
        let list = ev.querySelector("#evidenceList");
        if (list) {
            list.className = "final-ev-list";
        }

        let bottom = ev.querySelector(".bottom");
        if (bottom) {
            bottom.classList.add("three");
            bottom.classList.add("compact-bottom");
            bottom.innerHTML = `
                <button class="btn-dark" onclick="showScreen('settings')">Back</button>
                <button class="btn-purple" onclick="finalLoadEvidenceReview()">Refresh</button>
                <button class="btn-green" onclick="showScreen('home')">Home</button>
            `;
        }
    }

    if (!document.getElementById("evidence-final-image")) {
        const view = document.createElement("div");
        view.innerHTML = `
            <div id="evidence-final-image" class="screen">
                <div class="header">
                    <div class="title">EVIDENCE IMAGE</div>
                    <div class="time"></div>
                </div>

                <div class="final-ev-image-box">
                    <img id="finalEvidenceImage" class="final-ev-image" alt="Evidence image">
                    <div id="finalEvidenceCaption" class="final-ev-caption">--</div>
                    <div id="finalEvidenceMeta" class="final-ev-meta">--</div>
                </div>

                <div class="bottom three compact-bottom">
                    <button class="btn-dark" onclick="showScreen('evidence-review')">Back</button>
                    <button class="btn-purple" onclick="finalToggleEvidenceImage()">Raw/Box</button>
                    <button class="btn-green" onclick="showScreen('home')">Home</button>
                </div>
            </div>
        `;
        document.body.appendChild(view);
    }
}

function patchEvidenceSettingsTile() {
    const settings = document.getElementById("settings");
    if (!settings) return;

    const buttons = settings.querySelectorAll(".menu-grid button");
    if (!buttons || buttons.length < 4) return;

    buttons[3].onclick = function () {
        finalLoadEvidenceReview();
        showScreen("evidence-review");
    };

    const title = buttons[3].querySelector(".m-title");
    const sub = buttons[3].querySelector(".m-sub");

    if (title) title.textContent = "Evidence";
    if (sub) sub.textContent = "Dose images and AI result";
}

function finalDecisionClass(decision) {
    if (decision === "VERIFIED_AI" || decision === "CUSTOM_COUNT_CAMERA") return "final-ev-ok";
    if (decision === "AI_UNCERTAIN_REVIEW") return "final-ev-warn";
    return "final-ev-bad";
}

function finalModeBadge(item) {
    if (item.expected_ai_class && item.expected_ai_class !== "custom") {
        return '<span class="final-ev-pill final-ev-ai">AI</span>';
    }
    return '<span class="final-ev-pill final-ev-custom">CUSTOM</span>';
}

function finalConfidenceText(model) {
    if (!model || model.confidence === null || model.confidence === undefined) return "N/A";
    try {
        return (Number(model.confidence) * 100).toFixed(1) + "%";
    } catch (e) {
        return String(model.confidence);
    }
}

function finalDoseText(item) {
    if (item.dose_time) {
        return `${item.dose_period || "Scheduled dose"} • ${item.dose_time}`;
    }
    return item.created_at || "Captured evidence";
}

async function finalLoadEvidenceReview() {
    buildFinalEvidenceScreens();

    const box = document.getElementById("evidenceList");
    if (!box) return;

    box.className = "final-ev-list";
    box.innerHTML = `
        <div class="final-ev-item">
            <div class="final-ev-main">Loading evidence...</div>
            <div class="final-ev-sub">Please wait</div>
        </div>
    `;

    try {
        const res = await fetch("/api/evidence/latest?limit=30&ts=" + Date.now());
        finalEvidenceRows = await res.json();

        if (!finalEvidenceRows || !finalEvidenceRows.length) {
            box.innerHTML = `
                <div class="final-ev-item">
                    <div class="final-ev-main">No evidence captured yet</div>
                    <div class="final-ev-sub">Evidence appears after camera + AI capture</div>
                </div>
            `;
            return;
        }

        box.innerHTML = finalEvidenceRows.map((item, index) => {
            const model = item.model_result || {};
            const decision = item.decision || "UNKNOWN";
            const cls = finalDecisionClass(decision);
            const conf = finalConfidenceText(model);

            const hasBox = model.bbox ? "Box" : "No box";

            return `
                <div class="final-ev-item" data-index="${index}">
                    <div class="final-ev-main">
                        ${index + 1}. ${item.expected_name || "Medication"}
                        ${finalModeBadge(item)}
                    </div>
                    <div class="final-ev-sub">
                        ${finalDoseText(item)}
                    </div>
                    <div class="final-ev-sub">
                        Decision: <span class="${cls}">${decision}</span> • ${hasBox}
                    </div>
                    <div class="final-ev-sub">
                        AI: ${model.detected_class || "N/A"} • ${conf}
                    </div>
                </div>
            `;
        }).join("");

        // Bind click and touchstart directly to each item.
        box.querySelectorAll(".final-ev-item[data-index]").forEach(el => {
            const idx = Number(el.dataset.index);

            el.onclick = function (e) {
                e.preventDefault();
                e.stopPropagation();
                finalOpenEvidenceImage(idx);
            };

            el.ontouchstart = function (e) {
                e.preventDefault();
                e.stopPropagation();
                finalOpenEvidenceImage(idx);
            };
        });

    } catch (e) {
        box.innerHTML = `
            <div class="final-ev-item">
                <div class="final-ev-main"><span class="final-ev-bad">Evidence load failed</span></div>
                <div class="final-ev-sub">Check API service</div>
            </div>
        `;
    }
}

function finalOpenEvidenceImage(index) {
    const item = finalEvidenceRows[index];
    if (!item) return;

    finalEvidenceSelected = item;
    finalEvidenceMode = "annotated";

    finalUpdateEvidenceImage();
    showScreen("evidence-final-image");
}

function finalUpdateEvidenceImage() {
    if (!finalEvidenceSelected) return;

    const item = finalEvidenceSelected;
    const model = item.model_result || {};
    const img = document.getElementById("finalEvidenceImage");
    const caption = document.getElementById("finalEvidenceCaption");
    const meta = document.getElementById("finalEvidenceMeta");

    const url = finalEvidenceMode === "raw" ? item.raw_url : item.annotated_url;

    if (img) {
        img.src = (url || "") + "?t=" + Date.now();
    }

    const conf = finalConfidenceText(model);
    const hasBox = model.bbox ? "Bounding box available" : "No bbox from model";

    if (caption) {
        caption.textContent = `${item.expected_name || "Medication"} • ${item.decision || "UNKNOWN"}`;
    }

    if (meta) {
        meta.textContent = `AI: ${model.detected_class || "N/A"} • ${conf} • ${hasBox} • ${finalDoseText(item)}`;
    }
}

function finalToggleEvidenceImage() {
    if (!finalEvidenceSelected) return;

    finalEvidenceMode = finalEvidenceMode === "annotated" ? "raw" : "annotated";
    finalUpdateEvidenceImage();
}

window.finalLoadEvidenceReview = finalLoadEvidenceReview;
window.finalOpenEvidenceImage = finalOpenEvidenceImage;
window.finalToggleEvidenceImage = finalToggleEvidenceImage;
