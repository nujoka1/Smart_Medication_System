/*
Settings page scroll fix + Stepper Test button color fix.

This matches the real TFT structure:
#settings
  .menu-grid
    button.menu-btn
*/

(function initSettingsScrollFix() {
    injectSettingsScrollCSS();
    setTimeout(applySettingsScrollFix, 500);
    setInterval(applySettingsScrollFix, 2000);
})();

function injectSettingsScrollCSS() {
    if (document.getElementById("settings-scroll-stepper-css")) return;

    const style = document.createElement("style");
    style.id = "settings-scroll-stepper-css";

    style.textContent = `
        /* SETTINGS PAGE MUST NOT LET CONTENT HIDE UNDER BOTTOM BUTTONS */
        #settings {
            overflow: hidden !important;
        }

        #settings .menu-grid {
            max-height: 214px !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            padding-right: 8px !important;
            padding-bottom: 78px !important;
            touch-action: pan-y !important;
            -webkit-overflow-scrolling: touch !important;
        }

        #settings .menu-grid::-webkit-scrollbar {
            width: 20px !important;
        }

        #settings .menu-grid::-webkit-scrollbar-track {
            background: #100d20 !important;
            border-radius: 20px !important;
        }

        #settings .menu-grid::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, #7c3aed, #00c853) !important;
            border-radius: 20px !important;
            border: 3px solid #100d20 !important;
        }

        /* Keep bottom buttons above scroll content */
        #settings .bottom {
            z-index: 30000 !important;
            background: linear-gradient(180deg, rgba(10,6,18,0), #0a0612 35%) !important;
            padding-top: 8px !important;
        }

        #settings .bottom button {
            height: 48px !important;
            font-size: 14px !important;
            border-radius: 12px !important;
        }

        /* Match existing system button style */
        #settings .menu-btn {
            background: #17112b !important;
            border: 1px solid var(--line) !important;
            color: #ffffff !important;
            text-align: left !important;
            padding: 8px 10px !important;
            border-radius: 14px !important;
        }

        #settings .menu-btn .m-title {
            color: #ffffff !important;
            font-size: 17px !important;
            font-weight: 900 !important;
        }

        #settings .menu-btn .m-sub {
            color: var(--muted) !important;
            font-size: 11px !important;
            font-weight: 700 !important;
        }

        #settings .menu-btn:active {
            transform: scale(0.97) !important;
        }
    `;

    document.head.appendChild(style);
}

function applySettingsScrollFix() {
    const settings = document.getElementById("settings");
    if (!settings) return;

    const grid = settings.querySelector(".menu-grid");
    if (grid) {
        grid.style.maxHeight = "214px";
        grid.style.overflowY = "auto";
        grid.style.overflowX = "hidden";
        grid.style.paddingRight = "8px";
        grid.style.paddingBottom = "78px";
    }

    const stepperBtn = document.getElementById("stepperSettingsButton");
    if (stepperBtn) {
        stepperBtn.classList.add("menu-btn");
    }
}
