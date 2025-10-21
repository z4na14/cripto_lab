from urllib.parse import urlparse
import http.server
import json
import psycopg2


class MyHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"message": "Hello over HTTPS!"}).encode())

    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(length)
        try:
            data = json.loads(post_data)
        except json.JSONDecodeError:
            data = {"error": "Invalid JSON"}
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"received": data}).encode())

    def handle_get_users(self):
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT id, pwd_hs FROM Users;")
                rows = cur.fetchall()
            users = [{"id": r[0], "name": r[1], "email": r[2]} for r in rows]
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(users).encode())
        except Exception as e:
            self.send_error(500, str(e))

    def handle_post_user(self):
        length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(length)
        try:
            data = json.loads(post_data)
            name = data.get("name")
            email = data.get("email")
            if not name or not email:
                raise ValueError("Missing 'name' or 'email'")

            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO users (name, email) VALUES (%s, %s) RETURNING id;",
                    (name, email)
                )
                user_id = cur.fetchone()[0]

            self.send_response(201)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"id": user_id, "name": name, "email": email}).encode())

        except json.JSONDecodeError:
            self.send_error(400, "Invalid JSON")
        except Exception as e:
            self.send_error(500, str(e))



if __name__ == "__main__":
    # Configurar conexión HTTP para realizar peticiones
    server_address = ('0.0.0.0', 9000)
    httpd = http.server.HTTPServer(server_address, MyHandler)
    httpd.serve_forever()

    # Realizar conexión a la base de datos
    conn = psycopg2.connect(
        dbname="postgres",
        user="postgres",
        password="UwU",
        host="0.0.0.0",
        port="5432"
    )
    conn.autocommit = True

    # Crear tabla para los usuarios si esta no está ya presente
    with conn.cursor() as cur:
        cur.execute("""
        CREATE TABLE IF NOT EXISTS Users (
            id PRIMARY KEY,
            pwd_hs typea NOT NULL,
            creado date NOT NULL
        );
                    """)
