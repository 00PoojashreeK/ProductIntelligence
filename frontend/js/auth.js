// ============================================================
// Product Intelligence AI - Login
// ============================================================

const API = "https://productintelligence-lzcn.onrender.com";

document.addEventListener("DOMContentLoaded", () => {

    const loginForm = document.getElementById("loginForm");
    const message = document.getElementById("message");

    if (!loginForm) {
        console.error("Login form not found.");
        return;
    }

    loginForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();

        // Clear previous message
        if (message) {
            message.textContent = "";
            message.style.color = "";
        }

        if (!email || !password) {
            showMessage("Please enter email and password.", false);
            return;
        }

        // Disable button while logging in
        const loginButton = loginForm.querySelector("button[type='submit']");

        if (loginButton) {
            loginButton.disabled = true;
            loginButton.textContent = "Logging in...";
        }

        try {

            // IMPORTANT:
            // FastAPI Form(...) requires FormData / form-urlencoded,
            // NOT JSON.

            const formData = new FormData();

            formData.append("email", email);
            formData.append("password", password);

            const response = await fetch(`${API}/login`, {
                method: "POST",
                body: formData
            });

            let result;

            try {
                result = await response.json();
            } catch (jsonError) {
                throw new Error(
                    `Backend returned an invalid response (${response.status}).`
                );
            }

            console.log("Login response:", result);

            if (!response.ok) {
                throw new Error(
                    result.detail ||
                    result.message ||
                    `Login failed (${response.status}).`
                );
            }

            if (result.success === true) {

                // Save login information
                localStorage.setItem(
                    "pi_logged_in",
                    "true"
                );

                localStorage.setItem(
                    "pi_user",
                    JSON.stringify(
                        result.user || {
                            name: email.split("@")[0],
                            email: email
                        }
                    )
                );

                showMessage(
                    "Login successful. Redirecting...",
                    true
                );

                // Redirect to dashboard
                setTimeout(() => {
                    window.location.href = "dashboard.html";
                }, 500);

            } else {

                showMessage(
                    result.message ||
                    "Invalid login details.",
                    false
                );
            }

        } catch (error) {

            console.error("Login error:", error);

            showMessage(
                "Unable to connect to the backend. Make sure FastAPI is running.",
                false
            );

        } finally {

            if (loginButton) {
                loginButton.disabled = false;
                loginButton.textContent = "Login";
            }
        }
    });


    function showMessage(text, success) {

        if (!message) return;

        message.textContent = text;

        message.style.marginTop = "14px";
        message.style.fontWeight = "600";

        if (success) {
            message.style.color = "#22c55e";
        } else {
            message.style.color = "#ef4444";
        }
    }

});