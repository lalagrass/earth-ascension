"""Dependency-free localhost dashboard and JSON API."""
import argparse
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from .store import Store


def serve(db_path, host="127.0.0.1", port=8765):
    store = Store(db_path)
    html = (Path(__file__).parent / "static" / "index.html").read_bytes()

    class Handler(BaseHTTPRequestHandler):
        def _reply(self, status, body, content_type="application/json; charset=utf-8"):
            payload = body if isinstance(body, bytes) else json.dumps(body, ensure_ascii=False).encode()
            self.send_response(status)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(payload)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(payload)

        def do_GET(self):
            parsed = urlparse(self.path)
            if parsed.path == "/":
                return self._reply(200, html, "text/html; charset=utf-8")
            if parsed.path == "/api/world":
                try:
                    q = parse_qs(parsed.query)
                    month = int(q["month"][0]) if "month" in q else None
                    return self._reply(200, store.read(month))
                except (ValueError, KeyError) as exc:
                    return self._reply(400, {"error": str(exc)})
            self._reply(404, {"error": "找不到頁面"})

        def do_POST(self):
            if self.path not in ("/api/advance", "/api/characters"):
                return self._reply(404, {"error": "找不到操作"})
            origin = self.headers.get("Origin")
            if origin and origin != f"http://{host}:{port}":
                return self._reply(403, {"error": "不允許跨來源操作"})
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if length > 65536:
                    return self._reply(413, {"error": "請求過大"})
                data = json.loads(self.rfile.read(length))
                if self.path == "/api/advance":
                    world, events = store.advance(data.get("expected_month"))
                    return self._reply(200, {"world": world, "events": events})
                return self._reply(201, store.create_character(data))
            except (ValueError, KeyError, TypeError, json.JSONDecodeError) as exc:
                self._reply(400, {"error": str(exc)})

    server = ThreadingHTTPServer((host, port), Handler)
    print(f"Earth Ascension: http://{host}:{port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default="world.sqlite3")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    serve(args.db, args.host, args.port)


if __name__ == "__main__":
    main()
