---
layout: powpac
title: Login
permalink: /login
search_exclude: true
show_reading_time: false
description: Log in to your account or create a new one.
---

<div class="ocs__container">
  <span class="ocs__badge">Member Access</span>
  <h1>Login or Sign Up</h1>
  <p class="ocs__description">
    Log in with your Username, or create an account to get started.
  </p>

  <div class="ocs__split">
    <section class="ocs__card" aria-labelledby="login-heading">
      <h2 class="ocs__section-title" id="login-heading">User Login</h2>
      <form id="pythonForm" onsubmit="loginBoth(); return false;">
        <div class="ocs__field">
          <label class="ocs__label" for="uid">Username</label>
          <input class="ocs__input" type="text" id="uid" name="uid" placeholder="Username" autocomplete="username" required>
        </div>
        <div class="ocs__field">
          <label class="ocs__label" for="password">Password</label>
          <input class="ocs__input" type="password" id="password" name="password" placeholder="Password" autocomplete="current-password" required>
        </div>
        <p id="message" class="ocs__text" role="status" aria-live="polite" style="color: var(--red);"></p>
        <div class="ocs__links">
          <button type="submit" class="ocs__btn accent fill">Login</button>
        </div>
      </form>
    </section>

    <section class="ocs__card" aria-labelledby="signup-heading">
      <h2 class="ocs__section-title" id="signup-heading">Sign Up</h2>
      <form id="signupForm" onsubmit="signup(); return false;">
        <div class="ocs__field">
          <label class="ocs__label" for="name">Name</label>
          <input class="ocs__input" type="text" id="name" name="name" placeholder="Name" autocomplete="name" required>
        </div>
        <div class="ocs__field">
          <label class="ocs__label" for="signupUid">Username</label>
          <input class="ocs__input" type="text" id="signupUid" name="uid" placeholder="Username" autocomplete="username" required>
        </div>
        <div class="ocs__field">
          <label class="ocs__label" for="signupSid">PowPac ID</label>
          <input class="ocs__input" type="text" id="signupSid" name="sid" placeholder="PowPac ID" required>
        </div>
        <div class="ocs__field">
          <label class="ocs__label" for="signupEmail">Email</label>
          <input class="ocs__input" type="email" id="signupEmail" name="email" placeholder="Email" autocomplete="email" required>
        </div>
        <div class="ocs__field">
          <label class="ocs__label" for="signupPassword">Password</label>
          <input class="ocs__input" type="password" id="signupPassword" name="password" placeholder="Password" autocomplete="new-password" required>
        </div>
        <p>
          <label class="ocs__toggle">
            <input class="ocs__toggle-input" type="checkbox" name="kasmNeeded" id="kasmNeeded">
            <span class="ocs__toggle-track" aria-hidden="true"></span>
            <span class="ocs__toggle-label">I'm a Volunteer</span>
          </label>
        </p>
        <p id="signupMessage" class="ocs__text" role="status" aria-live="polite" style="color: var(--green);"></p>
        <div class="ocs__links">
          <button type="submit" class="ocs__btn accent fill" id="signupButton">Sign Up</button>
        </div>
      </form>
    </section>
  </div>
</div>

<script type="module">
    import { login, pythonURI, javaURI, fetchOptions } from '{{site.baseurl}}/assets/js/api/config.js';
    // Function to handle both Python and Java login simultaneously
    window.loginBoth = function () {
    javaLogin();  // Call Java login
    pythonLogin();
};
    // Function to handle Python login
    window.pythonLogin = function () {
        const options = {
            URL: `${pythonURI}/api/authenticate`,
            callback: pythonDatabase,
            message: "message",
            method: "POST",
            cache: "no-cache",
            body: {
                uid: document.getElementById("uid").value,
                password: document.getElementById("password").value,
            }
        };
        login(options);
    }
    // Function to handle Java login
    window.javaLogin = function () {
    const loginURL = `${javaURI}/authenticate`;
    const databaseURL = `${javaURI}/api/person/get`;
    const signupURL = `${javaURI}/api/person/create`;
    const userCredentials = JSON.stringify({
        uid: document.getElementById("uid").value,
        password: document.getElementById("password").value,
    });
    const loginOptions = {
        ...fetchOptions,
        method: "POST",
        body: userCredentials,
    };
    console.log("Attempting Java login...");
    fetch(loginURL, loginOptions)
        .then(response => {
            if (!response.ok) {
                throw new Error("Invalid login");
            }
            return response.json();
        })
        .then(data => {
            console.log("Login successful!", data);
            window.location.href = '{{site.baseurl}}/profile';
            // Fetch database after login success using fetchOptions
            return fetch(databaseURL, fetchOptions);
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Spring server response: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Java database response:", data);
        })
        .catch(error => {
            console.error("Login failed:", error.message);
            // If login fails, attempt account creation
            if (error.message === "Invalid login") {
                alert("Login for Spring failed. Creating a new Java account...");
                const signupData = JSON.stringify({
                    uid: document.getElementById("uid").value,
                    email: document.getElementById("uid").value + "@gmail.com",
                    dob: "11-01-2024", // Static date, can be modified
                    name: document.getElementById("uid").value,
                    password: document.getElementById("password").value,
                    kasmServerNeeded: false,
                });
                const signupOptions = {
                    ...fetchOptions,
                    method: "POST",
                    body: signupData,
                };
                fetch(signupURL, signupOptions)
                    .then(signupResponse => {
                        if (!signupResponse.ok) {
                            throw new Error("Account creation failed!");
                        }
                        return signupResponse.json();
                    })
                    .then(signupResult => {
                        console.log("Account creation successful!", signupResult);
                        alert("Account Creation Successful. Logging you into Flask/Spring!");
                        // Retry login after account creation
                        return fetch(loginURL, loginOptions);
                    })
                    .then(newLoginResponse => {
                        if (!newLoginResponse.ok) {
                            throw new Error("Login failed after account creation");
                        }
                        console.log("Login successful after account creation!");
                        // Fetch database after successful login
                        return fetch(databaseURL, fetchOptions);
                    })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`Spring server response: ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        console.log("Java database response:", data);
                    })
                    .catch(newLoginError => {
                        console.error("Error after account creation:", newLoginError.message);
                    });
            } else {
                console.log("Logged in!");
            }
        });
};
    // Function to fetch and display Python data
    function pythonDatabase() {
        const URL = `${pythonURI}/api/id`;
        fetch(URL, fetchOptions)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Flask server response: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                window.location.href = '{{site.baseurl}}/profile';
            })
            .catch(error => {
                document.getElementById("message").textContent = `Error: ${error.message}`;
            });
    }
    window.signup = function () {
        const signupButton = document.getElementById("signupButton");
        // Disable the button and change its color
        signupButton.disabled = true;
        signupButton.classList.add("disabled");
        const signupOptionsPython = {
            URL: `${pythonURI}/api/user`,
            method: "POST",
            cache: "no-cache",
            body: {
                name: document.getElementById("name").value,
                uid: document.getElementById("signupUid").value,
                email: document.getElementById("signupEmail").value,
                password: document.getElementById("signupPassword").value,
                kasm_server_needed: document.getElementById("kasmNeeded").checked,
            }
        };
        const signupOptionsJava = {
            URL: `${javaURI}/api/person/create`,
            method: "POST",
            cache: "no-cache",
            headers: new Headers({
                "Content-Type": "application/json"
            }),
            body: JSON.stringify({
                uid: document.getElementById("signupUid").value,
                sid: document.getElementById("signupSid").value,
                email: document.getElementById("signupEmail").value,
                dob: "11-01-2024",  // Static date for now, you can modify this
                name: document.getElementById("name").value,
                password: document.getElementById("signupPassword").value,
                kasmServerNeeded: document.getElementById("kasmNeeded").checked,
            })
        };
        fetch(signupOptionsJava.URL, signupOptionsJava)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    document.getElementById("signupMessage").innerText = "Sign up successful!";
                } else {
                    document.getElementById("signupMessage").innerText = "Sign up failed: " + data.message;
                }
            })
            .catch(error => {
                document.getElementById("signupMessage").innerText = "Error: " + error.message;
                console.error('Error during signup:', error);
            });
        fetch(signupOptionsPython.URL, {
            method: signupOptionsPython.method,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(signupOptionsPython.body)
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Signup failed on one or both backends: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                document.getElementById("signupMessage").textContent = "Signup successful!";
                // Optionally redirect to login page or handle as needed
                // window.location.href = '{{site.baseurl}}/profile';
            })
            .catch(error => {
                console.error("Signup Error:", error);
                document.getElementById("signupMessage").textContent = `Signup Error: ${error.message}`;
                // Re-enable the button if there is an error
                signupButton.disabled = false;
                signupButton.classList.remove("disabled");
                signupButton.style.backgroundColor = ''; // Reset to default color
            });
    }
    function javaDatabase() {
        const URL = `${javaURI}/api/person/get`;
        fetch(URL, fetchOptions)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Spring server response: ${response.status}`);
                }
                return response.json();
            })
            .catch(error => {
                console.error("Java Database Error:", error);
            });
    }
</script>
