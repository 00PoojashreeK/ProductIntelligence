const API_URL = ((window.location.protocol === "file:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? "http://127.0.0.1:8000" : "https://productintelligence-lzcn.onrender.com");

document.addEventListener("DOMContentLoaded", function () {

    const loginForm = document.getElementById("loginForm");

    if (!loginForm) {
        console.error("loginForm not found.");
        return;
    }

    loginForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const emailElement = document.getElementById("email");
        const passwordElement = document.getElementById("password");
        const messageElement = document.getElementById("message");

        if (!emailElement || !passwordElement || !messageElement) {
            console.error("Login elements not found.");
            return;
        }

        const email = emailElement.value.trim();
        const password = passwordElement.value;

        console.log("LOGIN DEBUG");
        console.log("Email:", email);
        console.log("Password entered:", password.length > 0);

        // ----------------------------------------------------
        // CHECK EMPTY FIELDS
        // ----------------------------------------------------

        if (email === "" || password === "") {

            messageElement.style.color = "#dc2626";
            messageElement.textContent =
                "Please enter your email and password.";

            return;
        }

        // ----------------------------------------------------
        // SHOW LOGIN MESSAGE
        // ----------------------------------------------------

        messageElement.style.color = "#94a3b8";
        messageElement.textContent = "Logging in...";

        try {

            // ------------------------------------------------
            // SEND DATA AS QUERY PARAMETERS
            // This matches the current FastAPI /login endpoint
            // ------------------------------------------------

            const loginURL =
                `${API_URL}/login` +
                `?email=${encodeURIComponent(email)}` +
                `&username=${encodeURIComponent(email)}` +
                `&password=${encodeURIComponent(password)}`;

            const response = await fetch(
                loginURL,
                {
                    method: "POST"
                }
            );

            console.log(
                "Login status:",
                response.status
            );

            // ------------------------------------------------
            // READ RESPONSE
            // ------------------------------------------------

            const data = await response.json();

            console.log(
                "Login response:",
                data
            );

            // ------------------------------------------------
            // SUCCESS
            // ------------------------------------------------

            if (
                response.ok &&
                data.success === true
            ) {

                messageElement.style.color = "#16a34a";

                messageElement.textContent =
                    "Login successful!";

                // --------------------------------------------
                // SAVE USER
                // --------------------------------------------

                if (data.user) {

                    localStorage.setItem(
                        "user",
                        JSON.stringify(data.user)
                    );

                } else {

                    localStorage.setItem(
                        "user",
                        JSON.stringify({
                            email: email,
                            username: email
                        })
                    );
                }

                // --------------------------------------------
                // REDIRECT
                // --------------------------------------------

                setTimeout(function () {

                    window.location.href =
                        "dashboard.html";

                }, 500);

            }

            // ------------------------------------------------
            // LOGIN FAILED
            // ------------------------------------------------

            else {

                messageElement.style.color =
                    "#dc2626";

                messageElement.textContent =
                    data.message ||
                    data.detail ||
                    "Invalid username or password.";

            }

        }

        // ----------------------------------------------------
        // SERVER CONNECTION ERROR
        // ----------------------------------------------------

        catch (error) {

            console.error(
                "LOGIN ERROR:",
                error
            );

            messageElement.style.color =
                "#dc2626";

            messageElement.textContent =
                "Cannot connect to the server.";

        }

    });

});