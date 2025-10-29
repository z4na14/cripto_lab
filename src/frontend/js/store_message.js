// Guardar en memoria todos los elementos que vamos a modificar
const username = localStorage.getItem('user');
const token = localStorage.getItem('token');
const messageEl = document.getElementById("message");
const options_select = document.getElementById("services_option").options;
const form = document.getElementById("form");

// Función para mostrar errores debajo del campo de envio
function mostrarError(msg) {
    document.getElementById("errores").innerHTML = `
    <div class="alert alert-danger">${msg}</div>`;
}

// Mostrar mensajes de información debajo del campo de envio
function mostrarMessage(msg) {
    document.getElementById("logs").innerHTML = `
    <div class="alert alert-info" role="alert">${msg}</div>`;
}

// Liberar mensajes de info y error en la pagina
function clearMensajes() {
    document.getElementById("errores").innerHTML = "";
    document.getElementById("logs").innerHTML = "";
}

// Fucnion asincrona para mandar los mensajes al servidor
async function guardar_mensaje(ev) {
    ev.preventDefault(); // Evitar que la pagina se recarge al pulsar el boton
    clearMensajes();

    // Guardar en memria todos los elementos a enviar
    const message  = messageEl.value.trim();
    const gmail    = options_select.namedItem("gmail").selected;
    const telegram = options_select.namedItem("telegram").selected;
    const whatsapp = options_select.namedItem("whatsapp").selected;
    try {
        // Enviar la peticion
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
