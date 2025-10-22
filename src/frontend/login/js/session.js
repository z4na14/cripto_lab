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

        console.log(res);
        const data = await res.json();

        if (data.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', data.user);
            window.location.href = "/";
        } else {
            if (res.status === 503) {
                mostrarError("Usuario ya registrado.");
            } else if (res.status === 505) {
                mostrarError("El usuario debe contener minimo 5 " +
                    "caracteres alfanuméricos y la contraseña:" +
                    "<ul>" +
                    "<li>Mínimo 8 caracteres.</li>" +
                    "<li>Una mayúscula.</li>" +
                    "<li>Una minúscula.</li>" +
                    "<li>Un número.</li>" +
                    "<li>Un caracter especial.</li>" +
                    "</ul>")
            } else {
                mostrarError("Error interno.");
            }
        }
    } catch (err) {
        mostrarError("Error de conexión al servidor");
        console.log(err);
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

        console.log(res);
        const data = await res.json();

        if (data.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', data.user);
            window.location.href = "/";
        } else{
            if (res.status === 504) {
                mostrarError("Usuario inexistente.");
            } else if (res.status === 506) {
                mostrarError("Contraseña incorrecta.");
            } else {
                mostrarError("Error interno.");
            }
        }
    } catch (err) {
        mostrarError("Error de conexión al servidor");
        console.log(err);
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

            console.log(res);
            const data = await res.json();

            if (data.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', data.user);
                window.location.href = "/";
            } else {
                localStorage.removeItem('user');
                localStorage.removeItem('token');
            }
        } catch (err) {
            mostrarError("Error de conexión al servidor");
            console.log(err);
        }
    }
})();

loginBtn.addEventListener("click", login_usuario);
registerBtn.addEventListener("click", registrar_usuario);
