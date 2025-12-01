
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

// Función que devuelve el archivo crudo en memoria para poder editar bytes
function leerArchivoArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

// Función que convierte el ArrayBuffer a un Binary String (necesaria para la librería forge)
function arrayBufferToBinaryString(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return binary;
}

async function firmar_archivo(pdfFile, p12File, password) {
    try {
        console.log("Iniciando firma PAdES");

        // Leer ficheros a memoria para poder manipular los bytes
        const pdfBuffer = await leerArchivoArrayBuffer(pdfFile);
        const p12Buffer = await leerArchivoArrayBuffer(p12File);

        // Forge necesita un binary string, convertir el arraybuffer a binary string
        const p12Der = arrayBufferToBinaryString(p12Buffer);
        const p12Asn1 = forge.asn1.fromDer(p12Der);

        // Desencriptar el p12
        const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

        let keyData = null;
        let certData = null;

        // Búsqueda de clave y certificado
        for(let safeContent of p12.safeContents) {
            for(let safeBag of safeContent.safeBags) {
                // Buscar la clave privada
                if(safeBag.type === forge.pki.oids.pkcs8ShroudedKeyBag || safeBag.type === forge.pki.oids.keyBag) {
                    keyData = safeBag.key;
                }
                // Buscar el certificado
                if(safeBag.type === forge.pki.oids.certBag) {
                    // Usamos el primer certificado encontrado (Certificado de usuario)
                    // Si hay cadena de confianza, se deberían añadir en 'caCerts'
                    if (!certData) certData = safeBag.cert;
                }
            }
        }

        if (!keyData || !certData) mostrarError("Certificado P12 inválido o sin clave privada.");

        // Usamos pdf-lib para modificar la estructura lógica del pdf y añadir el campo de firma vacio
        const pdfDoc = await PDFLib.PDFDocument.load(pdfBuffer);
        const pages = pdfDoc.getPages();

        // Reservamos 12KB para asegurar que caben certificados grandes
        const SIGNATURE_LENGTH = 12000;
        const filler = '0'.repeat(SIGNATURE_LENGTH);

        // Marcador único para encontrar el ByteRange
        const PLACEHOLDER_SIGNATURE = [0, 1234567890, 1234567890, 1234567890];

        // Definimos el diccionario de firma
        const signatureDict = pdfDoc.context.obj({
            Type: 'Sig',
            Filter: 'Adobe.PPKLite',
            SubFilter: 'adbe.pkcs7.detached',
            ByteRange: PLACEHOLDER_SIGNATURE,       // Aquí irán los offsets
            Contents: PDFLib.PDFHexString.of(filler),       // Aquí se inyecta el Hex de la firma
            Reason: PDFLib.PDFString.of('Firmado digitalmente'),
            M: PDFLib.PDFString.fromDate(new Date()),
        });

        const signatureRef = pdfDoc.context.register(signatureDict);

        // Creamos el widget visual
        const widgetDict = pdfDoc.context.obj({
            Type: 'Annot',
            Subtype: 'Widget',
            FT: 'Sig',
            Rect: [0, 0, 0, 0],
            V: signatureRef,
            T: PDFLib.PDFString.of('Signature1'),
            F: 4,
            P: pages[0].ref,
        });
        const widgetRef = pdfDoc.context.register(widgetDict);

        // Anclamos el widget a la primera página y al catálogo
        pages[0].node.set(PDFLib.PDFName.of('Annots'), pdfDoc.context.obj([widgetRef]));
        pdfDoc.catalog.set(PDFLib.PDFName.of('AcroForm'), pdfDoc.context.obj({
            Fields: [widgetRef],
            SigFlags: 3,
        }));

        // Guardar generando un Uint8Array nuevo
        const pdfBytes = await pdfDoc.save({ useObjectStreams: false });
        const pdfUint8 = new Uint8Array(pdfBytes);

        // Ahora manipulamos el binario directamente

        // Encontrar el ByteRange
        const rangeMarker = "1234567890";
        const rangePos = findStringInUint8(pdfUint8, rangeMarker);
        if (rangePos === -1) mostrarError("No se encontró el marcador ByteRange.");

        // Retrocedemos hasta encontrar '['
        let byteRangeStart = rangePos;
        while(byteRangeStart > 0 && String.fromCharCode(pdfUint8[byteRangeStart]) !== '[') byteRangeStart--;

        // Avanzamos hasta ']'
        let byteRangeEnd = rangePos;
        while(byteRangeEnd < pdfUint8.length && String.fromCharCode(pdfUint8[byteRangeEnd]) !== ']') byteRangeEnd++;

        // Encontrar el Hueco de la Firma (< ... >)
        // Buscamos una secuencia larga de '0' (0x30)
        const searchSeq = new Uint8Array(100).fill(0x30);
        const contentMatchPos = findIndex(pdfUint8, searchSeq);
        if (contentMatchPos === -1) mostrarError("No se encontró el hueco de la firma.");

        // Ajustamos punteros para encontrar limitadores < y > del Hex
        let startSig = contentMatchPos;
        while(startSig > 0 && String.fromCharCode(pdfUint8[startSig]) !== '<') startSig--;

        let endSig = contentMatchPos;
        while(endSig < pdfUint8.length && String.fromCharCode(pdfUint8[endSig]) !== '>') endSig++;

        // Calculamos y escribimos el nuevo byterange
        // El PDF firmado consiste en: [Contenido antes de la firma] + [Firma] + [Contenido después de la firma]
        // La firma cubre: [Todo antes] + [Todo después]. El hueco de la firma se excluye del hash

        // Rango 1: Inicio hasta '<'
        const r1_start = 0;
        const r1_len = startSig;

        // Rango 2: Desde '>' hasta el final
        const r2_start = endSig + 1;
        const r2_len = pdfUint8.length - r2_start;

        // Construir string del array ByteRange manteniendo longitud exacta
        const totalSpaceInsideBrackets = (byteRangeEnd - byteRangeStart) - 1;
        let newByteRangeContent = `${r1_start} ${r1_len} ${r2_start} ${r2_len}`;

        // Rellenar con espacios (Padding del ByteRange)
        while(newByteRangeContent.length < totalSpaceInsideBrackets) {
            newByteRangeContent += " ";
        }

        // Sobrescribir el ByteRange en el buffer ORIGINAL antes de hashear
        const newByteRangeBytes = stringToUint8Array(newByteRangeContent);
        for(let i = 0; i < newByteRangeBytes.length; i++) {
            pdfUint8[byteRangeStart + 1 + i] = newByteRangeBytes[i];
        }

        // Extraemos los bytes exactos que ve el lector PDF.
        // Al usar slice(), hacemos una copia de los datos que ya tienen el ByteRange correcto.
        const part1 = pdfUint8.slice(r1_start, r1_len);
        const part2 = pdfUint8.slice(r2_start);

        // Convertir a BinaryString para Forge
        // Concatenamos las partes ignorando el hueco de la firma
        const p1_binary = arrayBufferToBinaryString(part1.buffer);
        const p2_binary = arrayBufferToBinaryString(part2.buffer);
        const dataToSign = p1_binary + p2_binary;

        const md = forge.md.sha256.create();
        md.update(dataToSign, 'raw');

        // Crear PKCS#7 SignedData
        const p7 = forge.pkcs7.createSignedData();
        p7.content = forge.util.createBuffer(dataToSign);

        p7.addCertificate(certData);
        p7.addSigner({
            key: keyData,
            certificate: certData,
            digestAlgorithm: forge.pki.oids.sha256,
            authenticatedAttributes: [
                { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
                { type: forge.pki.oids.messageDigest }, // Forge calcula esto automágicamente
                { type: forge.pki.oids.signingTime, value: new Date() }
            ]
        });

        // Generar firma detached (sin el contenido original)
        p7.sign({ detached: true });

        // Convertimos a DER y luego a Hex, que es lo que espera el PDF
        const rawSignature = forge.asn1.toDer(p7.toAsn1()).getBytes();
        let hexSignature = forge.util.bytesToHex(rawSignature);

        const availableSpace = endSig - startSig - 1;

        // Verificaciones de seguridad
        if (hexSignature.length > availableSpace) mostrarError("La firma es más grande que el hueco reservado.");

        // Padding con ceros a la derecha. Si la longitud es impar, añadimos un 0 extra para que sea Hex válido
        if (hexSignature.length % 2 !== 0) hexSignature += '0';

        // Rellenar el resto con '0' (que en ASCII hex es 0x30, un padding seguro para strings PDF)
        while (hexSignature.length < availableSpace) {
            hexSignature += '0';
        }

        // Escribir la firma HEX dentro del hueco < ... >
        const signatureBytes = stringToUint8Array(hexSignature);
        for(let i = 0; i < signatureBytes.length; i++) {
            pdfUint8[startSig + 1 + i] = signatureBytes[i];
        }

        // Forzar al buscador a descargar el archivo inmediatamente
        const blob = new Blob([pdfUint8], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = "DEBUG_" + pdfFile.name; // Añadir prefijo para distinguir el archivo
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log("Firma generada e inyectada");
        return new File([pdfUint8], pdfFile.name, { type: "application/pdf" });

    } catch (e) {
        console.error("Error en firma:", e);
        throw e;
    }
}

// Helpers básicos para buscar strings dentro de buffers binarios
function findStringInUint8(uint8, str) {
    const searchParams = stringToUint8Array(str);
    return findIndex(uint8, searchParams);
}
function findIndex(data, pattern) {
    for (let i = 0; i < data.length - pattern.length; i++) {
        let found = true;
        for (let j = 0; j < pattern.length; j++) {
            if (data[i + j] !== pattern[j]) {
                found = false;
                break;
            }
        }
        if (found) return i;
    }
    return -1;
}
function stringToUint8Array(str) {
    const arr = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
        arr[i] = str.charCodeAt(i);
    }
    return arr;
}

// Funcion asincrona para mandar los mensajes al servidor
async function guardar_mensaje(ev) {
    ev.preventDefault(); // Evitar que la pagina se recarge al pulsar el boton
    clearMensajes();

    // Recogemos referencias del DOM
    const file = fileInput.files[0];
    const keyFile = keyInput.files[0];
    const p12Password = passwordInput.value;

    const formData = new FormData();

    const message  = messageEl.value.trim();
    const gmail    = options_select.namedItem("gmail").selected;
    const telegram = options_select.namedItem("telegram").selected;
    const whatsapp = options_select.namedItem("whatsapp").selected;

    // Añadimos los datos textuales como string JSON
    formData.append("payload",
        JSON.stringify({
            username,
            token,
            message,
            gmail,
            telegram,
            whatsapp
        })
    );

    try {
        // Firmamos el PDF en cliente antes de subirlo
        const signedFile = await firmar_archivo(file, keyFile, p12Password);

        // Adjuntamos el PDF ya firmado
        formData.append("file", signedFile);

        const res = await fetch(`${API_BASE}/api/messages/upload`, {
            method: "POST",
            body: formData,
        });

        const data = await res.json();

        if (!data.ok) {
            mostrarError("Error: " + (data.error || "No se pudo guardar"));
        } else {
            mostrarMessage("Mensaje almacenado correctamente.");
        }
    } catch (err) {
        mostrarError("Error de conexión al servidor");
        console.log(err);
    }
}

form.addEventListener("submit", guardar_mensaje);
