
import { auth } from "./firebase.js";

import {
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

const usernameInput = document.getElementById("profileUsername");
const emailInput = document.getElementById("profileEmail");
const photoInput = document.getElementById("profilePhotoInput");
const photoPreview = document.getElementById("profilePhotoPreview");
const saveButton = document.getElementById("saveProfileButton");
const message = document.getElementById("profileMessage");

let selectedPhoto = null;
let originalUsername = "";
let originalPhotoURL = "";
let currentUser = null;

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.replace("login.html");
        return;
    }

    currentUser = user;

    originalUsername = user.displayName || "";
    originalPhotoURL = user.photoURL || "";

    usernameInput.value = originalUsername;
    emailInput.value = user.email || "";

    if (originalPhotoURL) {
        showPhoto(originalPhotoURL);
    } else {
        showInitial(originalUsername || user.email || "J");
    }

    selectedPhoto = null;
    photoInput.value = "";
    message.textContent = "";
});

function showInitial(value) {
    photoPreview.replaceChildren();
    photoPreview.textContent =
        value.trim().charAt(0).toUpperCase() || "J";
}

function showPhoto(source) {
    const image = document.createElement("img");
    image.src = source;
    image.alt = "Profile picture";
    photoPreview.replaceChildren(image);
}

photoInput.addEventListener("change", () => {
    const file = photoInput.files?.[0];

    if (!file) return;

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
        showNotification(
            "Invalid Photo",
            "Please select a JPG, PNG, or WEBP image.",
            "error"
        );
        photoInput.value = "";
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showNotification(
            "Photo Too Large",
            "Please choose an image smaller than 5 MB.",
            "error"
        );
        photoInput.value = "";
        return;
    }

    selectedPhoto = file;

    const reader = new FileReader();

    reader.onload = () => {
        showPhoto(reader.result);
        message.textContent =
            "Photo preview only. Permanent photo storage is not configured.";
    };

    reader.readAsDataURL(file);
});

saveButton.addEventListener("click", async () => {
    const user = auth.currentUser;
    const username = usernameInput.value.trim();

    if (!user || !currentUser) {
        window.location.replace("login.html");
        return;
    }

    if (!username) {
        showNotification(
            "Missing Information",
            "Please enter a username.",
            "error"
        );
        return;
    }

    const usernameChanged = username !== originalUsername;
    const photoChanged = selectedPhoto !== null;

    if (!usernameChanged && !photoChanged) {
        showNotification("No Changes!");
        return;
    }

    // A photo is only previewed until permanent storage is configured.
    if (!usernameChanged && photoChanged) {
        showNotification(
            "Photo Preview Only",
            "Your photo has not been permanently saved.",
            "error"
        );
        return;
    }

    saveButton.disabled = true;
    message.textContent = "Saving...";

    try {
        if (usernameChanged) {
            await updateProfile(user, {
                displayName: username
            });

            originalUsername = username;
        }

        usernameInput.value = user.displayName || username;

        if (!user.photoURL && !photoChanged) {
            showInitial(username);
        }

        showNotification(
            "Username Updated!",
            "Your username was saved successfully.",
            "success"
        );

        message.textContent = "";
    } catch (error) {
        console.error("Profile update error:", error);

        showNotification(
            "Update Failed",
            "Unable to save changes. Please try again.",
            "error"
        );
    } finally {
        saveButton.disabled = false;
    }
});

function showNotification(title, description = "", type = "warning") {
    const oldNotification =
        document.getElementById("profileNotification");

    if (oldNotification) {
        oldNotification.remove();
    }

    const isSuccess = type === "success";
    const isError = type === "error";

    let background = "#fff9db";
    let foreground = "#805b00";
    let borderColor = "#facc15";
    let iconBackground = "#facc15";
    let symbol = "✕";

    if (isSuccess) {
        background = "#e8f8ee";
        foreground = "#166534";
        borderColor = "#86efac";
        iconBackground = "#22c55e";
        symbol = "✓";
    } else if (isError) {
        background = "#fef2f2";
        foreground = "#991b1b";
        borderColor = "#fca5a5";
        iconBackground = "#ef4444";
        symbol = "!";
    }

    const notification = document.createElement("div");
    notification.id = "profileNotification";

    const icon = document.createElement("div");
    icon.textContent = symbol;

    const content = document.createElement("div");

    const heading = document.createElement("div");
    heading.textContent = title;
    heading.style.fontWeight = "700";

    content.appendChild(heading);

    if (description) {
        const detail = document.createElement("div");
        detail.textContent = description;

        Object.assign(detail.style, {
            marginTop: "4px",
            fontSize: "13px",
            fontWeight: "400"
        });

        content.appendChild(detail);
    }

    notification.append(icon, content);

    Object.assign(notification.style, {
        position: "fixed",
        top: "24px",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "16px 22px",
        background,
        color: foreground,
        border: `1px solid ${borderColor}`,
        borderRadius: "12px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
        zIndex: "9999",
        fontWeight: "600",
        maxWidth: "calc(100% - 40px)",
        boxSizing: "border-box"
    });

    Object.assign(icon.style, {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "28px",
        height: "28px",
        minWidth: "28px",
        borderRadius: "50%",
        background: iconBackground,
        color: "#ffffff",
        fontWeight: "700",
        flexShrink: "0"
    });

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}
