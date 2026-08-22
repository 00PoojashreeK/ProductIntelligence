const API_URL =
    "http://127.0.0.1:8000";


const loginForm =
    document.getElementById(
        "loginForm"
    );


if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            const email =
                document
                    .getElementById(
                        "email"
                    )
                    .value
                    .trim();


            const password =
                document
                    .getElementById(
                        "password"
                    )
                    .value;


            const message =
                document.getElementById(
                    "message"
                );


            message.innerText =
                "Logging in...";


            const formData =
                new FormData();


            formData.append(
                "email",
                email
            );


            formData.append(
                "password",
                password
            );


            try {

                const response =
                    await fetch(
                        API_URL + "/login",
                        {
                            method: "POST",
                            body: formData
                        }
                    );


                const data =
                    await response.json();


                if (data.success) {

                    localStorage.setItem(
                        "user",
                        JSON.stringify(
                            data.user
                        )
                    );


                    message.style.color =
                        "#16a34a";


                    message.innerText =
                        "Login successful!";


                    setTimeout(
                        function() {

                            window.location.href =
                                "dashboard.html";

                        },
                        500
                    );


                } else {

                    message.style.color =
                        "#dc2626";


                    message.innerText =
                        data.message ||
                        "Login failed.";

                }


            } catch (error) {

                console.error(
                    "Login error:",
                    error
                );


                message.style.color =
                    "#dc2626";


                message.innerText =
                    "Cannot connect to FastAPI.";

            }

        }
    );

}