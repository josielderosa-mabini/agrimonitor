
import { auth } from "./firebase.js";

import {
    onAuthStateChanged,
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword,
    signOut
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

// Settings elements
const accountEmail = document.getElementById("accountEmail");

const oldPassword = document.getElementById("oldPassword");
const newPassword = document.getElementById("newPassword");
const confirmNewPassword = document.getElementById("confirmNewPassword");
const changePasswordButton = document.getElementById("changePasswordButton");
const accountMessage = document.getElementById("accountMessage");

const waterThreshold = document.getElementById("waterThreshold");
const alertsEnabled = document.getElementById("alertsEnabled");
const refreshInterval = document.getElementById("refreshInterval");
const saveSettingsButton = document.getElementById("saveSettingsButton");
const saveMessage = document.getElementById("saveMessage");


// Center notification elements
const notificationOverlay = document.getElementById("notificationOverlay");
const notificationIcon = document.getElementById("notificationIcon");
const notificationTitle = document.getElementById("notificationTitle");
const notificationText = document.getElementById("notificationText");
const notificationButton = document.getElementById("notificationButton");

let notificationAction = null;

function showNotification(title, message, action = null) {
    notificationTitle.textContent = title;
    notificationText.textContent = message;

    const isMissingInformation = title === "Missing Information";
const isNoChanges = title === "No Changes";

notificationIcon.textContent = isMissingInformation
    ? "!"
    : isNoChanges
        ? "✕"
        : "✓";

notificationIcon.classList.toggle("error", isMissingInformation);
notificationIcon.classList.toggle("warning", isNoChanges);
    notificationAction = action;

    notificationOverlay.classList.add("show");
}

notificationButton.addEventListener("click", () => {
    notificationOverlay.classList.remove("show");

    if (notificationAction) {
        const action = notificationAction;
        notificationAction = null;
        action();
    }
});


// Dashboard page
const DASHBOARD_PAGE = "index.html";

// Check whether a user is logged in
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.replace("login.html");
        return;
    }

    accountEmail.value = user.email || "";
});

// Load saved settings
function loadSettings() {
    const saved = JSON.parse(
        localStorage.getItem("agrimonitorSettings") || "{}"
    );

    waterThreshold.value = saved.waterThreshold ?? 30;
    alertsEnabled.checked = saved.alertsEnabled ?? true;
    refreshInterval.value = String(saved.refreshInterval ?? 5);
}


 // Save preferences
saveSettingsButton.addEventListener("click", () => {
    const threshold = Number(waterThreshold.value);
    const interval = Number(refreshInterval.value);

    if (
        waterThreshold.value.trim() === "" ||
        !Number.isFinite(threshold) ||
        threshold < 0 ||
        threshold > 100
    ) {
        saveMessage.textContent =
            "Please enter a water level between 0 and 100.";
        saveMessage.style.color = "red";

        showNotification(
            "Invalid Water Level",
            "Please enter a water level between 0 and 100."
        );
        return;
    }

    if (
        refreshInterval.value.trim() === "" ||
        !Number.isFinite(interval) ||
        interval <= 0
    ) {
        saveMessage.textContent =
            "Please enter a valid refresh interval.";
        saveMessage.style.color = "red";

        showNotification(
            "Invalid Refresh Interval",
            "Please enter a valid refresh interval."
        );
        return;
    }

    const savedSettings = JSON.parse(
    localStorage.getItem("agrimonitorSettings") || "{}"
);

const hasChanges =
    Number(savedSettings.waterThreshold ?? 30) !== threshold ||
    (savedSettings.alertsEnabled ?? true) !== alertsEnabled.checked ||
    Number(savedSettings.refreshInterval ?? 5) !== interval;

if (!hasChanges) {
    showNotification(
        "No Changes",
        "You haven't changed any settings."
    );
    return;
}

    const settings = {
        waterThreshold: threshold,
        alertsEnabled: alertsEnabled.checked,
        refreshInterval: interval
    };

    try {
        localStorage.setItem(
            "agrimonitorSettings",
            JSON.stringify(settings)
        );

        saveMessage.textContent = "Settings saved successfully!";
        saveMessage.style.color = "green";

        showNotification(
            "Success!",
            "Settings saved successfully! Click Continue to return to the dashboard.",
            () => {
                window.location.href = DASHBOARD_PAGE;
            }
        );

    } catch (error) {
        console.error("Save settings error:", error);

        saveMessage.textContent = "Unable to save settings.";
        saveMessage.style.color = "red";

        showNotification(
            "Save Failed",
            "Unable to save settings. Please try again."
        );
    }
});


 // Change password, log out, and return to login page
changePasswordButton.addEventListener("click", async () => {
    const user = auth.currentUser;

    const oldValue = oldPassword.value;
    const newValue = newPassword.value;
    const confirmValue = confirmNewPassword.value;

    accountMessage.textContent = "";

    if (!user || !user.email) {
        accountMessage.textContent = "Please log in again.";
        accountMessage.style.color = "red";

        showNotification(
            "Session Expired",
            "Your session has expired. Please log in again."
        );
        return;
    }

    if (!oldValue || !newValue || !confirmValue) {
        accountMessage.textContent =
            "Please fill in all password fields.";
        accountMessage.style.color = "red";

        showNotification(
            "Missing Information",
            "Please fill in all password fields."
        );
        return;
    }

    if (newValue.length < 6) {
        accountMessage.textContent =
            "New password must contain at least 6 characters.";
        accountMessage.style.color = "red";

        showNotification(
            "Invalid Password",
            "Your new password must contain at least 6 characters."
        );
        return;
    }

    if (newValue !== confirmValue) {
        accountMessage.textContent =
            "New password and confirmation do not match.";
        accountMessage.style.color = "red";

        showNotification(
            "Password Mismatch",
            "Your new password and confirmation do not match."
        );
        return;
    }

    if (oldValue === newValue) {
        accountMessage.textContent =
            "Your new password must be different from your old password.";
        accountMessage.style.color = "red";

        showNotification(
            "Choose a New Password",
            "Your new password must be different from your old password."
        );
        return;
    }

    changePasswordButton.disabled = true;

    try {
        // Verify the current password
        const credential = EmailAuthProvider.credential(
            user.email,
            oldValue
        );

        await reauthenticateWithCredential(user, credential);

        // Update password only after verification succeeds
        await updatePassword(user, newValue);

        accountMessage.textContent =
            "Password changed successfully!";
        accountMessage.style.color = "green";

        oldPassword.value = "";
        newPassword.value = "";
        confirmNewPassword.value = "";

        showNotification(
            "Password Changed!",
            "Your password has been changed successfully. Click Continue to log out.",
            async () => {
                try {
                    await signOut(auth);
                    window.location.replace("login.html");
                } catch (error) {
                    console.error("Logout error:", error);

                    showNotification(
                        "Logout Failed",
                        "Your password was changed, but logout failed. Please log out manually."
                    );
                }
            }
        );

    } catch (error) {
        console.error("Password change error:", error);

        if (
            error.code === "auth/invalid-credential" ||
            error.code === "auth/wrong-password" ||
            error.code === "auth/invalid-login-credentials"
        ) {
            accountMessage.textContent =
                "The old password is incorrect. Please try again.";
        } else if (error.code === "auth/too-many-requests") {
            accountMessage.textContent =
                "Too many attempts. Please wait before trying again.";
        } else if (error.code === "auth/requires-recent-login") {
            accountMessage.textContent =
                "Please log out and log in again before changing your password.";
        } else {
            accountMessage.textContent =
                "Unable to change password. Please try again.";
        }

        accountMessage.style.color = "red";

        showNotification(
            "Password Change Failed",
            accountMessage.textContent
        );

    } finally {
        changePasswordButton.disabled = false;
    }
});

// Initial load
loadSettings();
