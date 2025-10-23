const username = localStorage.getItem('user');
const token = localStorage.getItem('token');
const messageEl = document.getElementById("message");
const options_select = document.getElementById("services_option").options;
const form = document.getElementById("form");

function mostrarError(msg) {
    document.getElementById("errores").innerHTML = `
    <div class="alert alert-danger">${msg}</div>`;
}

function mostrarMessage(msg) {
    document.getElementById("logs").innerHTML = `
    <div class="alert alert-info" role="alert">${msg}</div>`;
}

function clearMensajes() {
    document.getElementById("errores").innerHTML = "";
    document.getElementById("logs").innerHTML = "";
}

async function guardar_mensaje(ev) {
    ev.preventDefault();
    clearMensajes();

    const message  = messageEl.value.trim();
    const gmail   = options_select.namedItem("gmail").selected;
    const telegram= options_select.namedItem("telegram").selected;
    const whatsapp= options_select.namedItem("whatsapp").selected;
    try {
        const res = await fetch(`${API_BASE}/api/messages/upload`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
                {
                    username,
                    token,
                    message,
                    gmail,
                    telegram,
                    whatsapp                  
                })
        });

        const data = await res.json();

        if (!data.ok) {
            mostrarError("Error: No se pudo guardar el mensaje. (Máximo 2000 caracteres)");
        } else {
            mostrarMessage("Mensaje almacenado correctamente.");
        }
    } catch (err) {
        mostrarError("Error de conexión al servidor");
        console.log(err);
    }
}

form.addEventListener("submit", guardar_mensaje);