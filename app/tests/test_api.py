import http.client
import json
import tempfile
import threading
import unittest
from pathlib import Path

from jobdesk.api import App, make_server
from jobdesk.store import JobStore
from tests.fakes import FakePipeline, JD, make_config

TOKEN = "test-token-123"
EXT = "chrome-extension://abcdefghijklmnop"


class ApiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls._d = tempfile.TemporaryDirectory()
        root = Path(cls._d.name)
        cls.cfg = make_config(root)
        (cls.cfg.static_dir / "assets").mkdir(parents=True)
        (cls.cfg.static_dir / "index.html").write_text("<meta content='__TOKEN__'>")
        (cls.cfg.static_dir / "assets" / "index-abc123.js").write_text("console.log(1)")
        (cls.cfg.static_dir / "secret.txt").write_text("nope")
        cls.store = JobStore(cls.cfg.jobs_dir)
        cls.pipe = FakePipeline()
        cls.server = make_server(App(cls.cfg, cls.store, cls.pipe, TOKEN), 0)
        cls.port = cls.server.server_address[1]
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls._d.cleanup()

    def call(self, method, path, body=None, headers=None, raw=None):
        c = http.client.HTTPConnection("127.0.0.1", self.port, timeout=5)
        h = dict(headers or {})
        data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
        if data is not None:
            h["Content-Type"] = "application/json"
        c.request(method, path, body=data, headers=h)
        r = c.getresponse()
        payload = r.read()
        c.close()
        return r.status, dict(r.getheaders()), payload

    def authed(self, **extra):
        return dict({"X-Token": TOKEN}, **extra)

    # ---- pages and static ----
    def test_index_injects_token_and_sets_security_headers(self):
        s, h, b = self.call("GET", "/")
        self.assertEqual(s, 200)
        self.assertIn(TOKEN.encode(), b)
        self.assertEqual(h["Cache-Control"], "no-store")
        self.assertIn("script-src 'self'", h["Content-Security-Policy"])

    def test_built_assets_are_served_and_cached(self):
        s, h, b = self.call("GET", "/assets/index-abc123.js")
        self.assertEqual((s, b), (200, b"console.log(1)"))
        self.assertIn("immutable", h["Cache-Control"])
        self.assertEqual(self.call("GET", "/assets/missing.js")[0], 404)

    def test_assets_cannot_escape_the_assets_folder(self):
        self.assertEqual(self.call("GET", "/assets/%2e%2e%2fsecret.txt")[0], 404)
        self.assertEqual(self.call("GET", "/assets/..%2findex.html")[0], 404)
        self.assertEqual(self.call("GET", "/static/index.html")[0], 404)

    # ---- auth ----
    def test_jobs_require_token(self):
        self.assertEqual(self.call("GET", "/api/jobs")[0], 401)
        self.assertEqual(self.call("GET", "/api/jobs", headers={"X-Token": "wrong"})[0], 401)
        self.assertEqual(self.call("GET", "/api/jobs", headers=self.authed())[0], 200)

    def test_hostile_origin_is_rejected_even_with_token(self):
        self.assertEqual(self.call("GET", "/api/jobs", headers=self.authed(Origin="https://evil.example"))[0], 401)

    def test_extension_origin_is_allowed_with_cors_headers(self):
        s, h, _ = self.call("GET", "/api/jobs", headers=self.authed(Origin=EXT))
        self.assertEqual((s, h["Access-Control-Allow-Origin"]), (200, EXT))

    def test_preflight(self):
        s, h, _ = self.call("OPTIONS", "/api/jobs", headers={"Origin": EXT})
        self.assertEqual(s, 204)
        self.assertIn("X-Token", h["Access-Control-Allow-Headers"])
        s, h, _ = self.call("OPTIONS", "/api/jobs", headers={"Origin": "https://evil.example"})
        self.assertNotIn("Access-Control-Allow-Origin", h)

    # ---- creating and advancing jobs ----
    def test_create_validates_and_starts_the_gate(self):
        self.assertEqual(self.call("POST", "/api/jobs", {"jd": "too short"}, self.authed())[0], 400)
        self.assertEqual(self.call("POST", "/api/jobs", headers=self.authed(), raw=b"{not json")[0], 400)
        self.assertEqual(self.call("POST", "/api/jobs", {"jd": JD}, {})[0], 401)
        s, _, b = self.call("POST", "/api/jobs", {"jd": JD, "company": "Acme"}, self.authed())
        job = json.loads(b)
        self.assertEqual((s, job["company_hint"], job["status"]), (201, "Acme", "queued"))
        self.assertIn((job["id"], "gate"), self.pipe.started)

    def test_oversized_body_is_refused(self):
        h = self.authed()
        h["Content-Length"] = "999999"
        c = http.client.HTTPConnection("127.0.0.1", self.port, timeout=5)
        c.putrequest("POST", "/api/jobs")
        for k, v in h.items():
            c.putheader(k, v)
        c.endheaders()
        self.assertEqual(c.getresponse().status, 413)

    def make_job(self, **fields):
        st = self.store.create(JD)
        st.update(fields)
        self.store.save(st)
        return st["id"]

    def test_generate_needs_a_gate_and_is_not_reentrant(self):
        no_gate = self.make_job()
        no_gate_st = self.store.load(no_gate); no_gate_st["status"] = "error"; self.store.save(no_gate_st)
        self.assertEqual(self.call("POST", f"/api/jobs/{no_gate}/generate", {}, self.authed())[0], 409)
        running = self.make_job(status="generating", gate={"fit": "B"})
        self.assertEqual(self.call("POST", f"/api/jobs/{running}/generate", {}, self.authed())[0], 409)
        self.assertEqual(self.call("POST", "/api/jobs/20260101-000000-abcd/generate", {}, self.authed())[0], 404)

    def test_generate_saves_valid_mode_and_ignores_invalid_mode(self):
        jid = self.make_job(status="gated", gate={"fit": "B"}, company="Acme", role="SDE")
        s, _, _ = self.call("POST", f"/api/jobs/{jid}/generate", {"mode": "aggressive"}, self.authed())
        self.assertEqual(s, 202)
        self.assertEqual(self.store.load(jid)["mode"], "aggressive")
        self.assertIn((jid, "generate"), self.pipe.started)
        again = self.make_job(status="gated", gate={"fit": "B"}, mode="truthful")
        self.call("POST", f"/api/jobs/{again}/generate", {"mode": "bogus"}, self.authed())
        self.assertEqual(self.store.load(again)["mode"], "truthful")

    def test_retry_without_gate_reruns_the_gate(self):
        jid = self.make_job(status="error")
        self.call("POST", f"/api/jobs/{jid}/retry", {}, self.authed())
        self.assertIn((jid, "gate"), self.pipe.started)

    # ---- files ----
    def test_files_are_served_only_for_done_jobs_with_the_token(self):
        out = self.cfg.out_dir / "acme"
        out.mkdir(parents=True)
        (out / "Nikhil_Swami_Resume.pdf").write_bytes(b"%PDF-fake")
        (self.cfg.out_dir / "outside.txt").write_text("secret")
        jid = self.make_job(status="done", result={"folder": "acme", "files": ["Nikhil_Swami_Resume.pdf"]})
        s, h, b = self.call("GET", f"/files/{jid}/Nikhil_Swami_Resume.pdf?t={TOKEN}")
        self.assertEqual((s, b, h["Content-Type"]), (200, b"%PDF-fake", "application/pdf"))
        self.assertEqual(self.call("GET", f"/files/{jid}/Nikhil_Swami_Resume.pdf?t=wrong")[0], 401)
        self.assertEqual(self.call("GET", f"/files/{jid}/Nikhil_Swami_Resume.pdf")[0], 401)
        self.assertEqual(self.call("GET", f"/files/{jid}/%2e%2e%2foutside.txt?t={TOKEN}")[0], 404)
        self.assertEqual(self.call("GET", f"/files/{jid}/resume.html?t={TOKEN}")[0], 404)
        pending = self.make_job(status="gated")
        self.assertEqual(self.call("GET", f"/files/{pending}/Nikhil_Swami_Resume.pdf?t={TOKEN}")[0], 404)


if __name__ == "__main__":
    unittest.main()


class NotBuiltTest(unittest.TestCase):
    def test_missing_frontend_gives_a_helpful_message(self):
        with tempfile.TemporaryDirectory() as d:
            cfg = make_config(Path(d))
            server = make_server(App(cfg, JobStore(cfg.jobs_dir), FakePipeline(), TOKEN), 0)
            threading.Thread(target=server.serve_forever, daemon=True).start()
            try:
                c = http.client.HTTPConnection("127.0.0.1", server.server_address[1], timeout=5)
                c.request("GET", "/")
                r = c.getresponse()
                self.assertEqual(r.status, 503)
                self.assertIn(b"npm run build", r.read())
            finally:
                server.shutdown()
                server.server_close()
