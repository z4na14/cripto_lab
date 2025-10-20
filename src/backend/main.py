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



if __name__ == "__main__":
    server_address = ('0.0.0.0', 9000)
    httpd = http.server.HTTPServer(server_address, MyHandler)

    print("Servidor HTTP corriendo en https://api.localhost")
    httpd.serve_forever()
