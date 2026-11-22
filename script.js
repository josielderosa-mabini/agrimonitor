
import { database } from "./firebase.js";
import {
    ref,
    onValue
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js";

let currentWaterLevel = null;
let currentFlowRate = null;

const ESP32_API = "http://192.168.1.28/data";

async function fetchFlowRate() {
  try {
    const response = await fetch(ESP32_API, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000)
    });

    if (!response.ok) {
      throw new Error("ESP32 unavailable");
    }

    const data = await response.json();

    // Actual Flow Rate
    currentFlowRate =
      Number.isFinite(data.flowRate) && data.flowRate >= 0
        ? data.flowRate
        : null;

    // Actual Water Level
    currentWaterLevel =
      Number.isFinite(data.waterLevel) &&
      data.waterLevel >= 0 &&
      data.waterLevel <= 100
        ? data.waterLevel
        : null;

  } catch (error) {
    currentFlowRate = null;
    currentWaterLevel = null;

    console.error("ESP32 connection error:", error);
  }
}

const historyData = {
    labels: [],
    levels: [],
    flows: []
};

// Store the latest 5 alert events
let alertHistory = [];
let activeAlerts = [];
let alertIdCounter = 0;

function updateDashboard() {
    const waterLevel = currentWaterLevel;

    const flowRate = currentFlowRate !== null
        ? currentFlowRate.toFixed(2)
        : "--";

    document.getElementById("waterLevel").textContent =
        waterLevel !== null ? waterLevel.toFixed(2) : "--";

    document.getElementById("flowRate").textContent = flowRate;

    document.getElementById("waterBar").style.width =
        waterLevel !== null ? waterLevel + "%" : "0%";

    const waterMessage = document.getElementById("waterMessage");

    if (waterLevel === null) {
        waterMessage.textContent = "Sensor reading unavailable";
        waterMessage.style.color = "#64748b";

    } else if (waterLevel < 25) {
        waterMessage.textContent = "Warning: Low water level";
        waterMessage.style.color = "#dc2626";

    } else {
        waterMessage.textContent = "Water supply level";
        waterMessage.style.color = "#16a34a";
    }

    
function drawHistoryChart() {
    const canvas = document.getElementById("historyChart");

    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    if (rect.width === 0 || rect.height === 0) return;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    const left = 45;
    const right = 45;
    const top = 20;
    const bottom = 35;

    const chartWidth = width - left - right;
    const chartHeight = height - top - bottom;

    // Background and grid lines
    ctx.font = "11px Arial";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    for (let i = 0; i <= 4; i++) {
        const y = top + (chartHeight * i) / 4;
        const value = 100 - i * 25;

        ctx.beginPath();
        ctx.strokeStyle = "#e5e7eb";
        ctx.moveTo(left, y);
        ctx.lineTo(width - right, y);
        ctx.stroke();

        ctx.fillStyle = "#64748b";
        ctx.fillText(value + "%", left - 8, y);

        ctx.textAlign = "left";
        ctx.fillText((5 - i * 1.25).toFixed(i === 4 ? 0 : 2), width - right + 8, y);
        ctx.textAlign = "right";
    }

    const count = historyData.levels.length;

    if (count === 0) {
        ctx.fillStyle = "#64748b";
        ctx.textAlign = "center";
        ctx.fillText("Waiting for sensor readings...", width / 2, height / 2);
        return;
    }

    const xPosition = (index) =>
        left + (count === 1 ? chartWidth / 2 : (index / (count - 1)) * chartWidth);

    const yPosition = (value) =>
        top + chartHeight - (value / 100) * chartHeight;

    // Draw water level line
ctx.beginPath();
ctx.strokeStyle = "#299b70";
ctx.lineWidth = 2.5;

let waterLineStarted = false;

historyData.levels.forEach((value, index) => {
    if (value === null || !Number.isFinite(value)) {
        waterLineStarted = false;
        return;
    }

    const x = xPosition(index);
    const y = yPosition(value);

    if (!waterLineStarted) {
        ctx.moveTo(x, y);
        waterLineStarted = true;
    } else {
        ctx.lineTo(x, y);
    }
});

ctx.stroke();

    // Draw flow rate line (scale: 0–5 L/min)
    ctx.beginPath();
    ctx.strokeStyle = "#438dd5";
    ctx.lineWidth = 2.5;

    
let flowLineStarted = false;

historyData.flows.forEach((value, index) => {
    if (value === null || !Number.isFinite(value)) {
        flowLineStarted = false;
        return;
    }

    const x = xPosition(index);
    const y = yPosition((value / 5) * 100);

    if (!flowLineStarted) {
        ctx.moveTo(x, y);
        flowLineStarted = true;
    } else {
        ctx.lineTo(x, y);
    }
});


    ctx.stroke();

    
    // Responsive time labels
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = "10px Arial";

    const isMobileChart = width <= 500;

    // Desktop: original labels
    // Mobile: show fewer labels to prevent overlap
    const labelIndexes = [];

    if (isMobileChart) {
        if (count === 1) {
            labelIndexes.push(0);
        } else if (count === 2) {
            labelIndexes.push(0, 1);
        } else {
            labelIndexes.push(
                0,
                Math.floor((count - 1) / 2),
                count - 1
            );
        }
    } else {
        historyData.labels.forEach((label, index) => {
            if (
                count <= 5 ||
                index % 2 === 0 ||
                index === count - 1
            ) {
                labelIndexes.push(index);
            }
        });
    }

    labelIndexes.forEach((index) => {
        const label = historyData.labels[index];

        // Shorter time format on mobile
        const displayLabel = isMobileChart
            ? label.replace(/:\d{2}(?=\s*(AM|PM)?$)/i, "")
            : label;

        let x = xPosition(index);

        // Prevent labels from extending beyond chart edges
        if (isMobileChart) {
            const labelWidth = ctx.measureText(displayLabel).width;
            x = Math.max(
                labelWidth / 2 + 4,
                Math.min(width - labelWidth / 2 - 4, x)
            );
        }

        ctx.fillText(
            displayLabel,
            x,
            top + chartHeight + 10
        );
    });

}


    const alerts = [];

if (waterLevel === null) {
    if (currentFlowRate !== null) {
        alerts.push({
            key: "water-level-unavailable",
            message: "Water level sensor reading unavailable.",
            type: "warning"
        });
    }
} else if (waterLevel < 25) {
    alerts.push({
        key: "low-water",
        message: "Low water level detected. Please check the water supply.",
        type: "warning"
    });
}


if (currentFlowRate === null && currentWaterLevel === null) {
    alerts.push({
        key: "esp32-disconnected",
        message: "ESP32 disconnected or unavailable. Please check the connection.",
        type: "warning"
    });
} else if (currentFlowRate === null) {
    alerts.push({
        key: "flow-unavailable",
        message: "Water flow sensor reading unavailable.",
        type: "warning"
    });
} else if (currentFlowRate < 0.5) {
    alerts.push({
        key: "low-flow",
        message: "Water flow is low or stopped.",
        type: "warning"
    });
}


// Show Normal Status when there are no problems
if (alerts.length === 0) {
    alerts.push({
        key: "normal",
        message: "Water level and water flow are within normal conditions.",
        type: "normal"
    });
}

// Record newly detected alerts
alerts.forEach(function(alert) {
    if (!activeAlerts.includes(alert.key)) {
        alertHistory.unshift({
            id: ++alertIdCounter,
            message: alert.message,
            type: alert.type,
            time: new Date().toLocaleTimeString("en-PH")
        });

        // Keep only the latest 2 alerts
if (alertHistory.length > 2) {
    alertHistory.pop();
}
    }
});

activeAlerts = alerts.map(function(alert) {
    return alert.key;
});
    
    // Save the latest sample readings
    const now = new Date();
    const timeLabel = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });

    historyData.labels.push(timeLabel);
    historyData.levels.push(waterLevel);
    historyData.flows.push(currentFlowRate);

    // Keep only the latest 10 readings
    if (historyData.labels.length > 10) {
        historyData.labels.shift();
        historyData.levels.shift();
        historyData.flows.shift();
    }

    
    // Update the monitoring chart
    drawHistoryChart();

    
    // Display current and previous alerts in System Alerts
    const alertList = document.getElementById("alertList");
    const alertCount = document.getElementById("alertCount");

    alertCount.textContent =
        alertHistory.length +
        (alertHistory.length === 1 ? " alert" : " alerts");

    if (alertHistory.length === 0) {
        alertList.innerHTML =
            '<p class="empty-message">No alerts. The system is operating normally.</p>';
    } else {
        alertList.innerHTML = alertHistory.map(function(alert) {
            return '<div class="alert-item ' + alert.type + '">' +
                '<div class="alert-content">' +
                    '<h3>' +
                        (
    alert.type === "critical"
    ? "Critical Alert"
    : alert.type === "warning"
        ? "Warning Alert"
        : "Normal Status"
) +
                    '</h3>' +
                    '<p>' + alert.message + '</p>' +
                    '<small>Detected at: ' + alert.time + '</small>' +
                '</div>' +
            '</div>';
        }).join("");
    }

   
    // Update date and device information
    document.getElementById("currentDate").textContent =
        new Date().toLocaleDateString("en-PH", {
            year: "numeric",
            month: "long",
            day: "numeric"
        });

    document.getElementById("lastUpdated").textContent =
        new Date().toLocaleTimeString("en-PH");

    
const deviceStatus = document.getElementById("deviceStatus");

if (currentFlowRate !== null || currentWaterLevel !== null) {
    deviceStatus.textContent = "Connected";
    deviceStatus.style.color = "#16a34a";
} else {
    deviceStatus.textContent = "Disconnected";
    deviceStatus.style.color = "#dc2626";
}

}

// Fetch actual ESP32 readings every 5 seconds
async function refreshDashboard() {
    await fetchFlowRate();
    updateDashboard();

    // Check actual ESP32 water level for popup alerts
    checkWaterLevelPopup(currentWaterLevel);

    setTimeout(refreshDashboard, 5000);
}


refreshDashboard();


const menuToggle = document.getElementById("menuToggle");
const navigation = document.querySelector(".navigation");

if (menuToggle && navigation) {
    menuToggle.addEventListener("click", () => {
        const isOpen = navigation.classList.toggle("menu-open");
        menuToggle.setAttribute("aria-expanded", isOpen);
        menuToggle.textContent = isOpen ? "✕" : "☰";
    });

    navigation.querySelectorAll(".nav-link").forEach((link) => {
        link.addEventListener("click", () => {
            navigation.classList.remove("menu-open");
            menuToggle.setAttribute("aria-expanded", "false");
            menuToggle.textContent = "☰";
        });
    });
}


/* =========================================
   AgriMonitor - Water Level Popup Alerts
   ========================================= */

const waterAlertOverlay =
    document.getElementById("waterAlertOverlay");

const waterAlertCard =
    waterAlertOverlay?.querySelector(".water-alert-card");

const waterAlertTitle =
    document.getElementById("waterAlertTitle");

const waterAlertMessage =
    document.getElementById("waterAlertMessage");

const waterAlertReading =
    document.getElementById("waterAlertReading");

const waterAlertDismiss =
    document.getElementById("waterAlertDismiss");

// Track the last acknowledged alert condition
let lastWaterAlertState = "normal";
let waterAlertAcknowledged = false;

function checkWaterLevelPopup(waterLevel) {
    if (!waterAlertOverlay || !waterAlertCard) return;

    // Do not interpret unavailable readings as an empty tank
    if (waterLevel === null || !Number.isFinite(waterLevel)) {
        return;
    }

    let state = "normal";

    if (waterLevel <= 0) {
        state = "critical";
    } else if (waterLevel <= 25) {
        state = "warning";
    }

    // Reset after the water level returns to normal
    if (state === "normal") {
        lastWaterAlertState = "normal";
        waterAlertAcknowledged = false;
        waterAlertOverlay.hidden = true;
        return;
    }

    
if (state !== lastWaterAlertState) {
    lastWaterAlertState = state;
    waterAlertAcknowledged = false;

    // Play sound and vibrate for each new alert
    triggerAlertEffects(state);
}


    // Prevent the same alert from repeatedly appearing
    if (waterAlertAcknowledged) return;

    waterAlertCard.classList.toggle(
        "critical",
        state === "critical"
    );

    if (state === "critical") {
        waterAlertTitle.textContent = "Critical Alert!";
        waterAlertMessage.textContent =
            "Your water tank is empty. Please refill your water supply immediately.";
    } else {
        waterAlertTitle.textContent = "Low Water Level!";
        waterAlertMessage.textContent =
            "You're running out of water. Please refill your tank.";
    }

    waterAlertReading.textContent =
        "Water Level: " + waterLevel.toFixed(2) + "%";

    waterAlertOverlay.hidden = false;
}

if (waterAlertDismiss) {
    waterAlertDismiss.addEventListener("click", () => {
        waterAlertAcknowledged = true;
        waterAlertOverlay.hidden = true;
    });
}

/* =========================================
   AgriMonitor - Alert Sound & Vibration
   ========================================= */

let alertAudioContext = null;

function enableAlertAudio() {
    try {
        if (!alertAudioContext) {
            alertAudioContext = new (
                window.AudioContext || window.webkitAudioContext
            )();
        }

        if (alertAudioContext.state === "suspended") {
            alertAudioContext.resume().catch(console.warn);
        }
    } catch (error) {
        console.warn("Audio not supported:", error);
    }
}

// Browsers usually require user interaction to enable audio
document.addEventListener("pointerdown", enableAlertAudio);

function playAlertSound(state) {
    if (!alertAudioContext ||
        alertAudioContext.state !== "running") {
        return;
    }

    const critical = state === "critical";
    const count = critical ? 3 : 2;
    const frequency = critical ? 880 : 660;

    for (let i = 0; i < count; i++) {
        const oscillator = alertAudioContext.createOscillator();
        const gain = alertAudioContext.createGain();

        oscillator.type = "sine";
        oscillator.frequency.value = frequency;

        oscillator.connect(gain);
        gain.connect(alertAudioContext.destination);

        const start = alertAudioContext.currentTime + i * 0.35;
        const end = start + 0.18;

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.15, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, end);

        oscillator.start(start);
        oscillator.stop(end);
    }
}

function vibrateAlert(state) {
    if (!navigator.vibrate) return;

    if (state === "critical") {
        navigator.vibrate([300, 150, 300, 150, 300]);
    } else {
        navigator.vibrate([150, 100, 150]);
    }
}

function triggerAlertEffects(state) {
    playAlertSound(state);
    vibrateAlert(state);
}
