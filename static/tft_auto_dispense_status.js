/*
TFT Auto-Dispense Status Poller

The background service controls real dispensing.
TFT only displays:
- dispensing progress
- medication ready
- alarm acknowledgement
*/

let autoDispenseLastState = null;

(function initAutoDispenseStatus() {
    setInterval(pollAutoDispenseStatus, 3000);
    setTimeout(pollAutoDispenseStatus, 1500);
})();

function getAutoBatchText(status) {
    const batch = status.batch || [];
    if (!batch.length) return "Scheduled medication";

    return batch.map((x, i) => {
        return `${i + 1}. ${x.med || "Medication"} C${x.compartment ?? "-"}`;
    }).join(" | ");
}

function getAutoResultCount(status) {
    const results = status.results || [];
    if (!results.length) return "0 / 0";

    let actual = 0;
    let target = 0;

    results.forEach(r => {
        actual += Number(r.actual_count || 0);
        target += Number(r.target_count || 0);
    });

    return `${actual} / ${target}`;
}

async function pollAutoDispenseStatus() {
    try {
        const res = await fetch("/api/autodispense/status");
        const status = await res.json();

        autoDispenseLastState = status;

        if (status.state === "dispensing") {
            const progress = `${status.current_index || 1} / ${status.total || 1}`;

            const pillProgress = document.getElementById("pillProgress");
            if (pillProgress) pillProgress.textContent = progress;

            showScreen("dispensing");
            return;
        }

        if (status.state === "ready" && status.alarm_active) {
            const batchText = getAutoBatchText(status);
            const countText = getAutoResultCount(status);

            const duePatient = document.getElementById("duePatient");
            const dueMed = document.getElementById("dueMed");
            const dueQty = document.getElementById("dueQty");
            const dueStock = document.getElementById("dueStock");
            const dueStatus = document.getElementById("dueStatus");

            if (duePatient) duePatient.textContent = "Medication Ready";
            if (dueMed) dueMed.textContent = batchText;
            if (dueQty) dueQty.textContent = countText;
            if (dueStock) dueStock.textContent = "--";
            if (dueStatus) dueStatus.textContent = "Dispensing complete. Alarm active. Take medication, then press Acknowledge.";

            showScreen("due");
            return;
        }

    } catch (e) {
        // Do not disturb TFT if API is briefly busy.
    }
}

async function acknowledgeMedicationReady() {
    try {
        await fetch("/api/autodispense/acknowledge", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({})
        });
    } catch (e) {}

    showScreen("home");

    if (typeof loadData === "function") {
        await loadData();
    }
}

window.acknowledgeMedicationReady = acknowledgeMedicationReady;
