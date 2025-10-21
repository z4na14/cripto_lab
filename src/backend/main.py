#!/usr/bin/env python3
import http.server
import json
import psycopg2
import bcrypt
import secrets
from datetime import datetime

# Conexión a PostgreSQL
conn = psycopg2.connect(
    dbname="postgres",
    user="postgres",
    password="UwU",
    host="db",
    port="5432"
)
conn.autocommit = True

# Crear tabla si no existe
with conn.cursor() as cur:
    cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    username TEXT PRIMARY KEY,
                    password TEXT NOT NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    token TEXT
                    );
                """)


class MyHandler(http.server.SimpleHTTPRequestHandler):
    def _send_json(self, data, status=200):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/api/user":
            auth = self.headers.get("Authorization", "")
            token = auth.replace("Bearer ", "").strip()

            if not token:
                self._send_json({"ok": False, "error": "Token requerido"}, 401)
                return

            with conn.cursor() as cur:
                cur.execute("SELECT username FROM users WHERE token = %s;", (token,))
                row = cur.fetchone()

            if row:
                user = {"username": row[0], "created_at": row[1].isoformat()}
                self._send_json({"ok": True, "user": user})
            else:
                self._send_json({"ok": False, "error": "Token inválido"}, 401)
        else:
            self.send_error(404, "Ruta no encontrada")

    def do_POST(self):
        if self.path == "/api/user/register":
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(length)
                data = json.loads(body)
            except Exception:
                self._send_json({"ok": False, "error": "JSON inválido"}, 400)
                return

            username = data.get("username", "").strip()
            password = data.get("password", "").encode()

            if not username or not password:
                self._send_json({"ok": False, "error": "Faltan username o password"}, 400)
                return

            hashed = bcrypt.hashpw(password, bcrypt.gensalt()).decode()
            token = secrets.token_hex(8)  # 16 caracteres hex

            try:
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO users (username, password, token) VALUES (%s, %s, %s);",
                        (username, hashed, token)
                    )
                user = {"username": username, "created_at": datetime.now().isoformat()}
                self._send_json({"ok": True, "user": user, "token": token}, 201)
            except psycopg2.errors.UniqueViolation:
                self._send_json({"ok": False, "error": "El usuario ya existe"}, 409)
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)

        elif self.path == "/api/user/login":
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(length)
                data = json.loads(body)
            except Exception:
                self._send_json({"ok": False, "error": "JSON inválido"}, 400)
                return

            username = data.get("username", "").strip()
            password = data.get("password", "").encode()

            if not username or not password:
                self._send_json({"ok": False, "error": "Faltan username o password"}, 400)
                return

            hashed = bcrypt.hashpw(password, bcrypt.gensalt()).decode()

            with conn.cursor() as cur:
                cur.execute("SELECT username FROM users WHERE password = %s;", (hashed,))
                row = cur.fetchone()
            if row:
                user = {"username": row[0], "created_at": row[1].isoformat()}
                self._send_json({"ok": True, "user": user})
            else:
                self._send_json({"ok": False, "error": "Usuario no encontrado"}, 401)

        else:
            self.send_error(404, "Ruta no encontrada")


if __name__ == "__main__":
    server_address = ("0.0.0.0", 9000)
    httpd = http.server.HTTPServer(server_address, MyHandler)
    httpd.serve_forever()
