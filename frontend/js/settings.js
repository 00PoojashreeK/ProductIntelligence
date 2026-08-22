document.addEventListener("DOMContentLoaded", () => {
    const theme = localStorage.getItem("piTheme") || "dark";
    const aiEnabled = localStorage.getItem("piGeminiEnabled") !== "false";
    const notificationsEnabled = localStorage.getItem("piNotificationsEnabled") !== "false";

    function applyTheme(value) {
        const light = value === "light";
        window.ProductIQTheme ? window.ProductIQTheme.set(value) : document.body.classList.toggle("pi-light", light);
        /* theme handled by global-theme.js */
        localStorage.setItem("piTheme", light ? "light" : "dark");

        document.getElementById("lightTheme")?.classList.toggle("active", light);
        document.getElementById("darkTheme")?.classList.toggle("active", !light);

        const status = document.getElementById("themeStatus");
        if (status) status.textContent = light ? "Light" : "Dark";
    }

    function applyAI(enabled) {
        localStorage.setItem("piGeminiEnabled", enabled ? "true" : "false");
        const toggle = document.getElementById("aiToggle");
        const status = document.getElementById("aiStatus");
        toggle?.classList.toggle("on", enabled);
        if (status) status.textContent = enabled ? "Enabled" : "Disabled";
    }

    function applyNotifications(enabled) {
        localStorage.setItem("piNotificationsEnabled", enabled ? "true" : "false");
        const toggle = document.getElementById("notificationToggle");
        const status = document.getElementById("notificationStatus");
        toggle?.classList.toggle("on", enabled);
        if (status) status.textContent = enabled ? "Enabled" : "Disabled";
    }

    applyTheme(theme);
    applyAI(aiEnabled);
    applyNotifications(notificationsEnabled);

    document.getElementById("lightTheme")?.addEventListener("click", () => applyTheme("light"));
    document.getElementById("darkTheme")?.addEventListener("click", () => applyTheme("dark"));

    document.getElementById("aiToggle")?.addEventListener("click", () => {
        applyAI(localStorage.getItem("piGeminiEnabled") === "false");
    });

    document.getElementById("notificationToggle")?.addEventListener("click", () => {
        applyNotifications(localStorage.getItem("piNotificationsEnabled") === "false");
    });

    const reportView = document.getElementById("reportView");
    if (reportView) {
        reportView.value = localStorage.getItem("piReportView") || "overview";
        reportView.addEventListener("change", () => {
            localStorage.setItem("piReportView", reportView.value);
        });
    }

    document.getElementById("resetSettings")?.addEventListener("click", () => {
        localStorage.setItem("piTheme", "dark");
        localStorage.setItem("piGeminiEnabled", "true");
        localStorage.setItem("piNotificationsEnabled", "true");
        localStorage.setItem("piReportView", "overview");
        applyTheme("dark");
        applyAI(true);
        applyNotifications(true);
        if (reportView) reportView.value = "overview";
    });
});
