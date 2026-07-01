import http.server
import os
import mimetypes
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Map "/" → welcome.html, otherwise serve file from ROOT
        url_path = urlparse(self.path).path.lstrip("/")
        if url_path == "":
            url_path = "welcome.html"

        file_path = os.path.join(ROOT, url_path)
        real = os.path.realpath(file_path)
        if not real.startswith(os.path.realpath(ROOT)):
            self.send_response(403)
            self.end_headers()
            return

        try:
            with open(file_path, "rb") as f:
                content = f.read()
        except (FileNotFoundError, IsADirectoryError):
            self.send_response(404)
            self.end_headers()
            return

        ctype, _ = mimetypes.guess_type(file_path)
        self.send_response(200)
        self.send_header("Content-Type", ctype or "application/octet-stream")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def log_message(self, format, *args):
        pass


if __name__ == "__main__":
    httpd = http.server.HTTPServer(("127.0.0.1", 8080), Handler)
    httpd.serve_forever()
