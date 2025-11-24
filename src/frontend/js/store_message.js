// Guardar en memoria todos los elementos que vamos a modificar
const username = localStorage.getItem('user');
const token = localStorage.getItem('token');
const messageEl = document.getElementById("message");
const options_select = document.getElementById("services_option").options;
const form = document.getElementById("form");
const fileInput = document.getElementById("fileInput");
const keyInput = document.getElementById("keyInput");
const passwordInput = document.getElementById("p12password");

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

// Liberar mensajes de info y error en la página
function clearMensajes() {
    document.getElementById("errores").innerHTML = "";
    document.getElementById("logs").innerHTML = "";
}

// Funcion para leer un archivo como un binary string
function leerArchivoBinaryString(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.readAsArrayBuffer(file);

        reader.onload = () => {
            const arrayBuffer = reader.result;
            const bytes = new Uint8Array(arrayBuffer);
            let binaryString = "";

            for (let i = 0; i < bytes.byteLength; i++) {
                binaryString += String.fromCharCode(bytes[i]);
            }

            resolve(binaryString);
        };

        reader.onerror = () => reject(reader.error);
    });
}

// Funcion que procesa .p12 y firma el archivo
async function firmar_archivo(file, p12file, password) {
    try {
        if (!password) {
            throw new Error("Debes introducir la contraseña del archivo");
        }

        const p12Bin = await leerArchivoBinaryString(p12file);
        const fileCont = await leerArchivoBinaryString(file);

        // Decodificación del p12
        const p12Asn1 = forge.asn1.fromDer(p12Bin);
        const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);     // Desencriptar el contenedor p12, si contraseña mal, se lanza excepción

        // Buscar la clave privada dentro del archivo
        let privateKey = null;

        for(let safeBag of p12.safeContent) {
            if (safeBag.safeBags) {
                for(let bag of safeBag.safeBags) {
                    if(bag.key && bag.key.n) {
                        privateKey = bag.key;
                        break;
                    }
                }
            }
            if(privateKey) break;
        }

        if (!privateKey) {
            throw new Error("No se encontró clave privada en el archivo .p12");
        }

        // Crear hash y firmar
        const md = forge.md.sha256.create();
        md.update(fileCont, 'raw');
        
        // Firmar el hash
        const signature = privateKey.sign(md);

        // Convertir la firma a ArrayBuffer
        const signatureBuffer = new Uint8Array(signature.length);
        for(let i = 0; i < signature.length; i++) {
            signatureBuffer[i] = signature.charCodeAt(i);
        }

        return new File([signatureBuffer], file.name + ".sig", {type: "application/octet-stream"});
    
    } catch (error) {
        if (error.message && (error.message.includes("MAC") || error.message.includes("Invalid password"))) {
            throw new Error("Contraseña del P12 es incorrecta.");
        }
        throw error;
    }
}

// Fucnion asincrona para mandar los mensajes al servidor
async function guardar_mensaje(ev) {
    ev.preventDefault(); // Evitar que la pagina se recarge al pulsar el boton
    clearMensajes();

    const file = fileInput.files[0];
    const keyFile = keyInput.files[0];
    const p12Password = passwordInput.value;

    // Formulario a enviar al backend
    const formData = new FormData();

    // Guardar en memoria todos los elementos a enviar
    const message  = messageEl.value.trim();
    const gmail    = options_select.namedItem("gmail").selected;
    const telegram = options_select.namedItem("telegram").selected;
    const whatsapp = options_select.namedItem("whatsapp").selected;

    // Añadir datos del cliente
    formData.append("json-data",
        JSON.stringify(
        {
            username,
            token,
            message,
            gmail,
            telegram,
            whatsapp
        })
    );

    try {
        const signedFile = await firmar_archivo(file, keyFile, p12Password);
        // Añadir el archivo original
        formData.append("file", file);

        // Añadir archivo de firma
        formData.append("signed-file", signedFile);
        // Enviar la peticion
        const res = await fetch(`${API_BASE}/api/messages/upload`, {
            method: "POST",
            body: formData,
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
