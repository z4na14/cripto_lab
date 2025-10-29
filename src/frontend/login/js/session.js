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

    // Guardar en memoria el usuario y la conraseña introducidos
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
            // Si la informacion es correcta, reenviamos el usuario a la pagina principal
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', data.user);
            window.location.href = "/";
        } else {
            // Comparamos los codigos de estado recibidos para responder al usuario acorde
            // Todos estos códigos estan definidos en el codigo del backend
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
    // Igual que el register, pero los mensajes de error son diferentes
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
            localStorage.setItem('user', data.user);
            window.location.href = "/";
        } else {
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

// Validacion del token al abrir la pagina
(async function validarToken() {
    const token = localStorage.getItem('token');

    // Si existe un token, lo comprobamos
    if (token != null) {
        try {
            const res = await fetch(`${API_BASE}/api/user`, {
                method: "GET",
                headers: { Authorization: token }
            });

            const data = await res.json();

            // Si el token es valido, reenviamos el usuario a la pagina principal
            if (data.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', data.user);
                window.location.href = "/";
            } else {
                // En cualquier otro caso lo vaciamos para que inicie sesion de nuevo
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
