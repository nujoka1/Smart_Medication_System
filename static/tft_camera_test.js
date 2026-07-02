/*
MedSystem TFT Camera Test
Safe camera capture page. No motor movement.
*/

(function initCameraTest() {
    injectCameraCSS();
    injectCameraScreen();
    patchSettingsCameraButton();

    setTimeout(patchSettingsCameraButton, 1200);
    setInterval(patchSettingsCameraButton, 3000);
})();

function injectCameraCSS() {
    if (document.getElementById("camera-test-css")) return;

    const style = document.createElement("style");
    style.id = "camera-test-css";
    style.textContent = `
        .camera-box {
            height: 210px;
            background: #100d20;
            border: 1px solid #332552;
            border-radius: 14px;
            padding: 8px;
            margin-bottom: 58px;
            text-align: center;
        }

        .camera-preview {
            width: 100%;
            height: 150px;
            object-fit: contain;
            background: #05040d;
            border-radius: 10px;
            border: 1px solid #332552;
        }

        .camera-status {
            color: #18e179;
            font-size: 14px;
            font-weight: 900;
            margin-top: 8px;
        }

        .camera-note {
            color: #b9aecf;
            font-size: 11px;
            margin-top: 3px;
        }
    `;
    document.head.appendChild(style);
}

function injectCameraScreen() {
    if (document.getElementById("camera-test")) return;

    const wrap = document.createElement("div");
    wrap.innerHTML = `
        <div id="camera-test" class="screen">
            <div class="header">
                <div class="title">CAMERA TEST</div>
                <div class="time"></div>
            </div>

            <div class="camera-box">
                <img id="cameraPreview" class="camera-preview" alt="Camera preview">
                <div id="cameraStatus" class="camera-status">Ready</div>
                <div class="camera-note">Captures one test image using Raspberry Pi camera</div>
            </div>

            <div class="bottom three compact-bottom">
                <button class="btn-dark" onclick="showScreen('settings')">Back</button>
                <button class="btn-purple" onclick="captureCameraTest()">Capture</button>
                <button class="btn-green" onclick="showScreen('home')">Home</button>
            </div>
        </div>
    `;

    document.body.appendChild(wrap);
}

function patchSettingsCameraButton() {
    const settings = document.getElementById("settings");
    if (!settings) return;

    const buttons = settings.querySelectorAll(".menu-grid button");
    if (!buttons || buttons.length < 3) return;

    buttons[2].onclick = function () {
        showScreen("camera-test");
    };

    const title = buttons[2].querySelector(".m-title");
    const sub = buttons[2].querySelector(".m-sub");

    if (title) title.textContent = "Camera";
    if (sub) sub.textContent = "Capture test image";
}

async function captureCameraTest() {
    const status = document.getElementById("cameraStatus");
    const img = document.getElementById("cameraPreview");

    if (status) status.textContent = "Capturing...";

    try {
        const res = await fetch("/api/hardware/camera-test", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({})
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
            if (status) status.textContent = "Capture failed";
            return;
        }

        if (img) {
            img.src = data.image_url + "?t=" + Date.now();
        }

        if (status) {
            status.textContent = "Captured successfully";
        }

    } catch (e) {
        if (status) status.textContent = "API error";
    }
}
