#!/usr/bin/env python3
import http.server
import json
import psycopg2
import bcrypt
import secrets
import time
import re

# Conexión a PostgreSQL
# Si la base de datos no se ha iniciado a timepo,
# reintentar la conexión después de 1 segundo
while True:
    try:
        conn = psycopg2.connect(
            dbname="postgres",
            user="postgres",
            password="UwU",
            host="db",
            port="5432"
        )
        break
    except psycopg2.OperationalError:
        time.sleep(1)
        continue
# En cuanto se ejecutan los cambios, reflejarlos automaticamente en la base de datos
conn.autocommit = True

# Crear tabla de usuarios y mensajes si no existen
with conn.cursor() as cur:
    cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        password TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE
        );
    CREATE TABLE IF NOT EXISTS messages (
        username TEXT,
        message TEXT NOT NULL,
        time TIMESTAMP NOT NULL,
        gmail BOOLEAN NOT NULL,
        telegram BOOLEAN NOT NULL,
        whatsapp BOOLEAN NOT NULL,
        slack BOOLEAN NOT NULL,
        FOREIGN KEY(username) REFERENCES users(username)
        );
                """)

# Clase que hereda funciones y datos miembro de la libreria HTTP
class MyHandler(http.server.SimpleHTTPRequestHandler):
    # Almacenamiento temporal de las queries ejecutadas sobre la base de datos
    row = None
    # Minimo 5 caracteres de usuario, combinacion de caracteres alfanumericos
    usr_regex = re.compile(r"^[a-zA-Z0-9]{5,}$")
    # Minimo 8 caracteres, una mayuscula, una minuscula, 1 numero y un caracter especial
    passwd_regex = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$")

    # Handler para mandar el JSON de respuesta
    # CODIGOS DE RESPUESTA
    # - 200: OK
    # - 501: Token no existente
    # - 502: Peticion HTTP incorrecta
    # - 503: Usuario ya registrado
    # - 504: Usuario inexistente
    # - 505: Formato de usuario/contraseña incorrecto
    # - 506: Contraseña incorrecta
    # - 400: Error interno
    def _send_json(self, data, status=200):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    # Fucnion respuesta de las peticiones GET (Validar tokens del usuario)
    def do_GET(self):
        self.row = None
        if self.path == "/api/user":
            # Dentro de la llave Authorization del header se almacena el token de sesion
            token = self.headers.get("Authorization")

            if not token:
                self._send_json({"ok": False, "error": "Bad token (not received)"}, 502)
                return

            # Query a la base de datos para encontrar el usuario del respectivo token de sesion
            with conn.cursor() as cur:
                cur.execute("SELECT username FROM users WHERE token = %s;", (token,))
                self.row = cur.fetchone()

            # Responder a la peticion con el usuario enlazado al token de sesion
            if self.row:
                self._send_json({"ok": True, "user": self.row[0]})
            else:
                self._send_json({"ok": False, "error": "Bad token (no user)"}, 502)
                return
        else:
            self._send_json({"ok": False, "error": "Bad route"}, 404)
            return

    def do_POST(self):
        self.row = None
        try:
            # Cargar el cuerpo de la peticion con el JSON recibido
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length)
            data = json.loads(body)
        except Exception:
            self._send_json({"ok": False, "error": "Bad req content"}, 502)
            return

        # Cargar en variables los datos del cuerpo esperados
        try:
            username = data.get("username")
            password = data.get("password")
        except Exception:
            self._send_json({"ok": False, "error": "Missing user/pwd"}, 400)
            return

        if self.path == "/api/user/register":
            if not re.match(self.passwd_regex, password) or not re.match(self.usr_regex, username):
                self._send_json({"ok": False, "error": "Formato usuario/contraseña incorrecto"}, 505)
                return

            # Generar HASH con la contraseña y un salt aleatorio
            hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode()
            token = secrets.token_hex(8)  # 16 caracteres hex

            try:
                # Guardar el nuevo usuario en la base de datos
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO users (username, password, token) VALUES (%s, %s, %s);",
                        (username, hashed, token)
                    )
                # Devolver al cliente confirmacion del usuario y el token de sesion generado
                self._send_json({"ok": True, "user": username, "token": token})
            except psycopg2.errors.UniqueViolation:
                # Si el usuario ya esta registrado, salta la "violacion de valor unico"
                self._send_json({"ok": False, "error": "User already registered"}, 503)
                return
            except Exception:
                # Cualquier otro error lo generalizamos
                self._send_json({"ok": False, "error": "Unknown server error"}, 400)
                return

        elif self.path == "/api/user/login":
            try:
                # Buscamos el usuario de la peticion de login
                with conn.cursor() as cur:
                    cur.execute("SELECT password FROM users WHERE username = %s;", (username,))
                    self.row = cur.fetchone()
            except Exception:
                self._send_json({"ok": False, "error": "Unknown server error"}, 400)
                return

            if not self.row:
                self._send_json({"ok": False, "error": "User does not exist"}, 504)
                return

            elif self.row:
                # Usamos la misma libreria para comprobar si las contraseñas coinciden
                if bcrypt.checkpw(password.encode("utf-8"), self.row[0].encode("utf-8")):
                    # En el caso correcto, generamos el nuevo token de sesion
                    new_token = secrets.token_hex(8)

                    with conn.cursor() as cur:
                        # Y lo actualizamos en la base de datos
                        cur.execute("UPDATE users SET token = %s WHERE username = %s", (new_token, username))

                    self._send_json({"ok": True, "user": username, "token": new_token})
                else:
                    self._send_json({"ok": False, "error": "Wrong password"}, 506)
                    return

            else:
                self._send_json({"ok": False, "error": "Unknown server error"}, 400)
                return

        else:
            self._send_json({"ok": False, "error": "Bad route"}, 404)
            return



if __name__ == "__main__":
    server_address = ("0.0.0.0", 9000)
    httpd = http.server.HTTPServer(server_address, MyHandler)
    httpd.serve_forever()
