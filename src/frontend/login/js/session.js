const API_BASE = window.location.origin;

const usernameEl = document.getElementById("user");
const passwordEl = document.getElementById("password");
const loginBtn = document.getElementById("logBtn");
const registerBtn = document.getElementById("registerBtn");

function mostrarError(msg) {
    document.getElementById("errores").innerHTML = `
    <div class="alert alert-danger">${msg}</div>`;
}

async function registrar_usuario(ev) {
    ev.preventDefault();
    const username = usernameEl.value.trim();
    const password = passwordEl.value.trim();

    try {
        const res = await fetch(`${API_BASE}/api/user/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();
        if (data.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', data.user.username);
            window.location.href = "/";
        } else {
            mostrarError("Error al registrar usuario.");
        }
    } catch (err) {
        mostrarError("Error de conexión al servidor.");
    }
}

async function login_usuario(ev) {
    ev.preventDefault();
    const username = usernameEl.value.trim();
    const password = passwordEl.value.trim();

    try {
        const res = await fetch(`${API_BASE}/api/user/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (data.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', data.username);
            window.location.href = "/";
        } else {
            mostrarError("Usuario o contraseña incorrectos.");
        }
    } catch (err) {
        mostrarError("Error de conexión al servidor.");
    }
}


(async function validarToken() {
    const token = localStorage.getItem('token');

    if (token != null) {
        try {
            const res = await fetch(`${API_BASE}/api/user`, {
                method: "GET",
                headers: { Authorization: token }
            });
            const data = await res.json();
            if (data.ok) {
                window.location.href = "/";
            } else {
                localStorage.setItem('user', null);
                localStorage.setItem('token', null);
            }
        } catch (err) {
            mostrarError("No se pudo conectar con el servidor.");
        }
    }
})();

loginBtn.addEventListener("click", login_usuario);
registerBtn.addEventListener("click", registrar_usuario);
