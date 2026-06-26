import os
import http.server
import socketserver

# Render cung cấp port qua biến môi trường PORT, mặc định dùng 10000
PORT = int(os.environ.get("PORT", 10000))

class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

with socketserver.TCPServer(("", PORT), CORSRequestHandler) as httpd:
    print(f"Serving at port {PORT}")
    httpd.serve_forever()
