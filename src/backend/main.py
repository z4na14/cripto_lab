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
        row = None
        if self.path == "/api/user":
            token = self.headers.get("Authorization", "")

            if not token:
                self._send_json({"ok": False}, 401)
                return

            with conn.cursor() as cur:
                cur.execute("SELECT username FROM users WHERE token = %s;", (token,))
                row = cur.fetchone()

            if row:
                self._send_json({"ok": True, "user": row[0]})
            else:
                self._send_json({"ok": False}, 401)
        else:
            self.send_error(404, "Ruta no encontrada")

    def do_POST(self):
        row = None
        if self.path == "/api/user/register":
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(length)
                data = json.loads(body)
            except Exception:
                self._send_json({"ok": False}, 400)
                return

            username = data.get("username")
            password = data.get("password").encode("utf-8")

            if not username or not password:
                self._send_json({"ok": False}, 400)
                return

            hashed = bcrypt.hashpw(password, bcrypt.gensalt()).decode()
            token = secrets.token_hex(8)  # 16 caracteres hex

            try:
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO users (username, password, token) VALUES (%s, %s, %s);",
                        (username, hashed, token)
                    )
                self._send_json({"ok": True, "user": username, "token": token}, 201)
            except psycopg2.errors.UniqueViolation:
                self._send_json({"ok": False}, 409)
            except Exception as e:
                self._send_json({"ok": False}, 500)

        elif self.path == "/api/user/login":
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(length)
                data = json.loads(body)
            except Exception:
                self._send_json({"ok": False}, 400)
                return

            username = data.get("username")
            password = data.get("password").encode("utf-8")

            if not username or not password:
                self._send_json({"ok": False}, 400)
                return

            with conn.cursor() as cur:
                cur.execute("SELECT password FROM users WHERE username = %s;", (username,))
                row = cur.fetchone()
            if row:
                if bcrypt.checkpw(password, row[0].encode("utf-8")):
                    new_token = secrets.token_hex(8)

                    with conn.cursor() as cur:
                        cur.execute("UPDATE users SET token = %s WHERE username = %s", (new_token, username))

                    self._send_json({"ok": True, "user": username, "token": new_token}, 200)
            else:
                self._send_json({"ok": False}, 401)

        else:
            self.send_error(404, "Ruta no encontrada")


if __name__ == "__main__":
    server_address = ("0.0.0.0", 9000)
    httpd = http.server.HTTPServer(server_address, MyHandler)
    httpd.serve_forever()
