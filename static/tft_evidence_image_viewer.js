/*
MedSystem TFT Evidence Image Viewer
Keeps the Evidence list as it is.
When an evidence item is clicked, it opens the actual annotated image.
*/

let evidenceImageViewerItem = null;
let evidenceImageViewerMode = "annotated";

(function initEvidenceImageViewer() {
    injectEvidenceImageViewerCSS();
    injectEvidenceImageViewerScreen();

    // Override the existing openEvidenceDetail() from evidence review.
    // This keeps the list page unchanged, but changes the click action.
    window.openEvidenceDetail = openEvidenceImageOnly;

    setTimeout(() => {
        window.openEvidenceDetail = openEvidenceImageOnly;
    }, 1200);

    setInterval(() => {
        window.openEvidenceDetail = openEvidenceImageOnly;
    }, 3000);
})();

function injectEvidenceImageViewerCSS() {
    if (document.getElementById("evidence-image-viewer-css")) return;

    const style = document.createElement("style");
    style.id = "evidence-image-viewer-css";
    style.textContent = `
        .ev-image-view-box {
            height: 212px;
            background: #05040d;
            border: 1px solid #332552;
            border-radius: 14px;
            padding: 6px;
            margin-bottom: 56px;
        }

        .ev-image-full {
            width: 100%;
            height: 164px;
            object-fit: contain;
            background: #000000;
            border-radius: 10px;
            border: 1px solid #332552;
        }

        .ev-image-caption {
            font-size: 12px;
            color: #ffffff;
            font-weight: 900;
            margin-top: 5px;
            line-height: 1.15;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .ev-image-sub {
            font-size: 10px;
            color: #b9aecf;
            margin-top: 2px;
            line-height: 1.15;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .ev-image-warning {
            color: #f59e0b;
            font-weight: 900;
        }

        #evidence-image-view .bottom {
            z-index: 9999 !important;
        }

        #evidence-image-view .bottom button {
            height: 48px !important;
            font-size: 14px !important;
            border-radius: 12px !important;
        }
    `;
    document.head.appendChild(style);
}

function injectEvidenceImageViewerScreen() {
    if (document.getElementById("evidence-image-view")) return;

    const wrap = document.createElement("div");
    wrap.innerHTML = `
        <div id="evidence-image-view" class="screen">
            <div class="header">
                <div class="title">EVIDENCE IMAGE</div>
                <div class="time"></div>
            </div>

            <div class="ev-image-view-box">
                <img id="evidenceImageOnly" class="ev-image-full" alt="Evidence image">
                <div id="evidenceImageCaption" class="ev-image-caption">--</div>
                <div id="evidenceImageSub" class="ev-image-sub">--</div>
            </div>

            <div class="bottom three compact-bottom">
                <button class="btn-dark" onclick="showScreen('evidence-review')">Back</button>
                <button class="btn-purple" onclick="toggleEvidenceActualImage()">Raw/Box</button>
                <button class="btn-green" onclick="showScreen('home')">Home</button>
            </div>
        </div>
    `;

    document.body.appendChild(wrap);
}

function openEvidenceImageOnly(index) {
    if (!window.latestEvidenceRows && typeof latestEvidenceRows !== "undefined") {
        window.latestEvidenceRows = latestEvidenceRows;
    }

    const rows = window.latestEvidenceRows || latestEvidenceRows || [];
    const item = rows[index];

    if (!item) return;

    evidenceImageViewerItem = item;
    evidenceImageViewerMode = "annotated";

    updateEvidenceActualImage();
    showScreen("evidence-image-view");
}

function updateEvidenceActualImage() {
    if (!evidenceImageViewerItem) return;

    const item = evidenceImageViewerItem;
    const model = item.model_result || {};

    const img = document.getElementById("evidenceImageOnly");
    const caption = document.getElementById("evidenceImageCaption");
    const sub = document.getElementById("evidenceImageSub");

    const imageUrl = evidenceImageViewerMode === "raw"
        ? item.raw_url
        : item.annotated_url;

    if (img) {
        img.src = (imageUrl || "") + "?t=" + Date.now();
    }

    let conf = "N/A";
    if (model.confidence !== null && model.confidence !== undefined) {
        try {
            conf = (Number(model.confidence) * 100).toFixed(1) + "%";
        } catch (e) {
            conf = String(model.confidence);
        }
    }

    const doseText = item.dose_time
        ? `${item.dose_period || "Scheduled dose"} • ${item.dose_time}`
        : (item.created_at || "Captured evidence");

    if (caption) {
        caption.textContent = `${item.expected_name || "Medication"} • ${item.decision || "UNKNOWN"}`;
    }

    if (sub) {
        const boxText = model.bbox ? "Box available" : "No bbox from model";
        sub.innerHTML = `AI: ${model.detected_class || "N/A"} • ${conf} • <span class="ev-image-warning">${boxText}</span> • ${doseText}`;
    }
}

function toggleEvidenceActualImage() {
    if (!evidenceImageViewerItem) return;

    evidenceImageViewerMode = evidenceImageViewerMode === "annotated"
        ? "raw"
        : "annotated";

    updateEvidenceActualImage();
}
