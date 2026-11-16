"""HTTP layer: routing, auth, static files. No business logic: it calls the store and the pipeline."""
import json
import secrets
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

from .prompts import MODES

MIME = {".pdf": "application/pdf", ".txt": "text/plain; charset=utf-8", ".html": "text/html; charset=utf-8",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".png": "image/png",
        ".json": "application/json", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8"}
STATIC = {"app.css", "app.js", "logic.js", "views.js", "api.js"}
CSP = "default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'"
RUNNING = ("gating", "generating", "queued")
MAX_BODY = 200_000


class App:
    """What the handler needs: the store, the pipeline, the token and the config."""
    def __init__(self, config, store, pipeline, token):
        self.cfg, self.store, self.pipeline, self.token = config, store, pipeline, token


def make_handler(app: App):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass

        # ---- helpers ----
        def _origin_ok(self):
            o = self.headers.get("Origin", "")
            return o == "" or o.startswith(("http://127.0.0.1:", "http://localhost:", "chrome-extension://"))

        def _authed(self):
            return self._origin_ok() and secrets.compare_digest(self.headers.get("X-Token", ""), app.token)

        def _send(self, code, body, ctype="application/json", extra=None):
            if isinstance(body, (dict, list)):
                body = json.dumps(body).encode()
            elif isinstance(body, str):
                body = body.encode()
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            o = self.headers.get("Origin")
            if o and self._origin_ok():
                self.send_header("Access-Control-Allow-Origin", o)
                self.send_header("Vary", "Origin")
            for k, v in (extra or {}).items():
                self.send_header(k, v)
            self.end_headers()
            self.wfile.write(body)

        def _deny(self):
            self._send(401, {"error": "bad token"})

        # ---- verbs ----
        def do_OPTIONS(self):
            self.send_response(204)
            o = self.headers.get("Origin")
            if o and self._origin_ok():
                self.send_header("Access-Control-Allow-Origin", o)
                self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Token")
                self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.end_headers()

        def do_GET(self):
            u = urlparse(self.path)
            parts = [p for p in u.path.split("/") if p]
            if u.path == "/":
                html = (app.cfg.static_dir / "index.html").read_text().replace("__TOKEN__", app.token)
                return self._send(200, html, MIME[".html"], {"Cache-Control": "no-store", "Content-Security-Policy": CSP})
            if len(parts) == 2 and parts[0] == "static" and parts[1] in STATIC:
                f = app.cfg.static_dir / parts[1]
                return self._send(200, f.read_bytes(), MIME[f.suffix], {"Cache-Control": "no-cache"})
            if u.path == "/api/jobs":
                return self._send(200, app.store.list()) if self._authed() else self._deny()
            if len(parts) == 3 and parts[0] == "files":
                return self._file(parts[1], parts[2], parse_qs(u.query).get("t", [""])[0])
            self._send(404, {"error": "not found"})

        def _file(self, jid, name, token):
            if not secrets.compare_digest(token, app.token):       # opened by link, so the token rides in the URL
                return self._deny()
            st = app.store.load(jid)
            if not st or st.get("status") != "done" or name not in st["result"]["files"]:
                return self._send(404, {"error": "not found"})
            f = app.cfg.out_dir / st["result"]["folder"] / name
            if not f.is_file():
                return self._send(404, {"error": "not found"})
            self._send(200, f.read_bytes(), MIME.get(f.suffix, "application/octet-stream"),
                       {"Content-Disposition": f'inline; filename="{name}"'})

        def do_POST(self):
            if not self._authed():
                return self._deny()
            parts = [p for p in urlparse(self.path).path.split("/") if p]
            n = int(self.headers.get("Content-Length") or 0)
            if n > MAX_BODY:
                return self._send(413, {"error": "too large"})
            try:
                body = json.loads(self.rfile.read(n) or b"{}")
            except ValueError:
                return self._send(400, {"error": "bad json"})
            if parts == ["api", "jobs"]:
                return self._create(body)
            if len(parts) == 4 and parts[:2] == ["api", "jobs"] and parts[3] in ("generate", "retry"):
                return self._advance(parts[2], parts[3], body)
            self._send(404, {"error": "not found"})

        def _create(self, body):
            jd = (body.get("jd") or "").strip()
            if len(jd) < 80:
                return self._send(400, {"error": "JD text is too short"})
            st = app.store.create(jd, body.get("company") or "", body.get("role") or "", body.get("url") or "")
            app.pipeline.start(st["id"], "gate")
            self._send(201, st)

        def _advance(self, jid, action, body):
            st = app.store.load(jid)
            if not st:
                return self._send(404, {"error": "no such job"})
            if st["status"] in RUNNING:
                return self._send(409, {"error": "already running"})
            if body.get("mode") in MODES:
                st["mode"] = body["mode"]
            phase = "gate" if (action == "retry" and not st.get("gate")) else "generate"
            if phase == "generate" and not st.get("gate"):
                return self._send(409, {"error": "run the gate first"})
            st["status"] = "queued"
            app.store.save(st)
            app.pipeline.start(jid, phase)
            self._send(202, st)

    return Handler


def make_server(app: App, port: int):
    return ThreadingHTTPServer(("127.0.0.1", port), make_handler(app))
