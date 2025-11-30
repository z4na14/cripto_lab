#import "uc3mreport.typ": conf

#show: conf.with(
  degree: "Grado en Ingeniería Informática",
  subject: "Criptografía y seguridad informática",
  year: (25, 26),
  project: "Práctica 1",
  title: "OmniMessenger: Envío de mensajes en masa - Parte 2",
  group: 81,
  authors: (
    (
      name: "Denis Loren",
      surname: "Moldovan",
      nia: 100522240
    ),
    (
      name: "Jorge Adrian",
      surname: "Saghin Dudulea",
      nia: 100522257
    ),
  ),
  professor: "Lorena Gonzalez Manzano",
  toc: true,
  logo: "new",
  language: "es"
)

= Propósito y estructura

La aplicación consiste en el envío masivo de mensajes, usando servicios como Telegram (Bots), Whatsapp
(Business) y Gmail (Conexión al correo correspondiente), los cuales se almacenan para luego distribuirlos
de forma ordenada.

Esta consiste en un backend escrito en Python, y un frontend en HTML, CSS, y JavaScript, los cuales se
comunican mediante peticiones HTTP sobre TLS. Como no se va a desplegar la aplicación en un entorno de
servidor real, se ha omitido el uso de "dotfiles" para la gestión de direcciones y de tokens. Por otro lado,
el uso de la dirección "localhost" está codificado fuertemente dentro del código, entonces, si se quisiese
usar un dominio personalizado, habría que implementarlo dentro del código.

Para el acceso a todos los servicios, se ha usado #link("https://caddyserver.com/")[Caddy] como
proveedor de archivos, y proxy reversa. Además de asegurar un cifrado en la conexión, nos habilita el
uso de subdominios y subdirectorios, donde se han usado para separar, por ejemplo, el visor de la
base de datos. Por otro lado, se ha usado #link("https://www.postgresql.org/")[PostgreSQL] para la base de
datos y #link("https://www.adminer.org/en/")[Adminer] para la visualización de la base de datos. Finalmente,
para asegurar el funcionamiento en la mayoría de máquinas, se ha contenerizado toda la aplicación usando
#link("https://www.docker.com/")[Docker].

#figure(
  image("img/diagrama.png", width: 64%),
  caption: [Diseño de la aplicación]
)

== Como ejecutar la aplicación

Para ejecutar la aplicación, primero hay que #link("https://docs.docker.com/engine/install/")[descargar y configurar Docker].
Después, hay que construir la imagen personalizada usando `./setup.sh`, y finalmente ejecutar la aplicación usando `./run.sh`.
Para detenerlo, hay que ejecutar `./down.sh`. #footnote[La aplicación ha sido desarrollada y probada en un entorno de Linux.]

La página principal se encontrará en `https://localhost`, y el gestor de la base de datos en `https://db.localhost`.
#footnote[Usuario predeterminado: "postgres" / Contraseña: "Cripto2526".]
El certificado requerido para poder acceder al gestor se encuentra en `Docker/conf/SSL/Client/keystore.p12`, el cual
hay que instalar en el navegador. #footnote[Tiene una contraseña vacía]



= Pruebas realizadas

#table(
    columns: (auto, 0.3fr, 0.5fr, 0.62fr),
    align: left,
    table.header(
        [ID], [Descripción], [Entrada], [Resultado esperado],
    ),
    [1],
    [Flujo completo],
    [PDF válido, P12 válido, contraseña correcta y mensaje de texto < 2000 car.],
    [El navegador descarga `DEBUG_nombre.pdf`, la UI muestra "Mensaje almacenado correctamente" y dicho mensaje aparece reflejado en la base de datos.],

    [2],
    [Contraseña P12 incorrecta],
    [PDF válido, P12 válido, contraseña errónea.],
    [Se muestra un mensaje al usuario como que no se ha podido firmar el archivo.],

    [3],
    [Archivo de entrada no es PDF],
    [Seleccionar una imagen `.png` o `.docx` en el `fileInput` de firma.],
    [Excepción capturada por `PDFLib.load()`. Mensaje en consola/UI: "Failed to parse PDF header" o similar. No se descarga nada.],

    [4],
    [Validación Estricta de Firma],
    [Abrir el archivo `DEBUG_*.pdf` generado en el Test 1 en un lector compatible],
    [Aparece el archivo firmado, pero con un emisor irreconocido debido a la emisión en local.],

    [5],
    [P12 sin clave privada],
    [Un archivo `.p12` exportado solo con certificados públicos (sin la private key).],
    [Se muestra un mensaje de error al usuario al intentar enviar el mensaje como que el certificado no contiene una clave privada.],

    [6],
    [Exceso de longitud de mensaje],
    [Texto del mensaje mayor que 2500 caracteres.],
    [Petición devuelve un mensaje de error indicándoselo al usuario.],

    [7],
    [Token de sesión inválido/caducado],
    [Modificar `localStorage` manualmente con un token falso antes de enviar.],
    [Se comprueba en el backend que el token del cliente sea válido, y no se almacena nada en la base de datos, al no poder verificarlo.],

    [8],
    [Overflow del hueco de firma],
    [Reducir temporalmente en JS `SIGNATURE_LENGTH = 100` e intentar firmar.],
    [El JS lanza error antes de enviar: "La firma es más grande que el hueco reservado".],

    [9],
    [Inyección de caracteres en el PDF],
    [Usar un PDF que contenga la cadena "1234567890" en su texto visible.],
    [El algoritmo de búsqueda `findStringInUint8` debe encontrar el marcador del ByteRange (el diccionario) y no confundirse con el texto del contenido. El PDF resultante debe abrirse sin errores.],

    [10],
    [Integridad del Multipart],
    [Envío correcto del formulario.],
    [Al backend le llega la petición correctamente sin errores, y el archivo PDF sigue íntegro.],
)