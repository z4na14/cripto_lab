#import "uc3mreport.typ": conf

#show: conf.with(
  degree: "Grado en Ingeniería Informática",
  subject: "Criptografía y seguridad informática",
  year: (25, 26),
  project: "Práctica 1",
  title: "OmniMessenger: Envío de mensajes en masa",
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
(Business) y Gmail (Conexión al correo correspondiente). Esta almacena en un servidor todos los mensajes,
junto con las plataformas conectadas donde se van a distribuir, y la hora cuando se ha subido en una base
de datos privada. Después, el servidor genera una cola con estos mensajes y los va distribuyendo de forma
ordenada, reduciendo la carga acorde a los límites de cada plataforma.

El servicio se basa en una aplicación web, la cual actúa como interfaz para todas las acciones disponibles
para el usuario. Por otro lado, se usa como servidor un script escrito en Python, la cual gestiona las sesiones
de los usuarios, y almacena toda la información en una base de datos.

Para el acceso a todos los servicios, se ha usado #link("https://caddyserver.com/")[Caddy] como proveedor de archivos,
y proxy reversa a todos los servicios de la aplicación. Por otro lado, se ha usado #link("https://www.postgresql.org/")[PostgreSQL]
para la base de datos y #link("https://www.adminer.org/en/")[Adminer] para la visualización de la base de datos. Finalmente,
para asegurar el funcionamiento, se ha contenerizado toda la aplicación usando #link("https://www.docker.com/")[Docker].

#figure(
  image("img/diagrama.png", width: 60%),
  caption: [Diseño de la aplicación]
)

Para ejecutar la aplicación, primero hay que #link("https://docs.docker.com/engine/install/")[descargar y configurar Docker].
Después, hay que construir la imagen personalizada usando `./setup.sh`, y finalmente ejecutar la aplicación usando `./run.sh`.
Para detenerlo, hay que ejecutar `./down.sh`.

La página principal se encontrará en `https://localhost`, y el gestor de la base de datos en `https://db.localhost`. El certificado
requerido para poder acceder al gestor se encuentra en `Docker/conf/mTLS/Client/keystore.p12`, el cual hay que instalar en el navegador.

= Uso de cifrado simétrico y asimétrico




= Uso de Códigos de Autenticación de Mensajes (MAC)





= Pruebas realizadas


