"""Job state on disk: one folder per job holding jd.txt and state.json."""
import json
import re
import time
import uuid
from pathlib import Path

ID_RE = re.compile(r"^\d{8}-\d{6}-[0-9a-f]{4}$")
ACTIVE = ("queued", "gating", "generating")


def now() -> str:
    return time.strftime("%Y-%m-%d %H:%M:%S")


def slugify(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")[:60] or "job"


class JobStore:
    def __init__(self, jobs_dir: Path, clock=now):
        self.dir = Path(jobs_dir)
        self.clock = clock

    def _path(self, jid):
        return self.dir / jid / "state.json"

    def create(self, jd, company="", role="", source=""):
        jid = time.strftime("%Y%m%d-%H%M%S-") + uuid.uuid4().hex[:4]
        (self.dir / jid).mkdir(parents=True)
        (self.dir / jid / "jd.txt").write_text(jd)
        st = {"id": jid, "created": self.clock(), "updated": self.clock(), "status": "queued", "cost": 0,
              "company_hint": company.strip()[:80], "role_hint": role.strip()[:80], "source": source.strip()[:300],
              "jd_preview": jd[:160].replace("\n", " "), "gate": None, "result": None, "error": None}
        self.save(st)
        return st

    def load(self, jid):
        if not isinstance(jid, str) or not ID_RE.match(jid):
            return None
        try:
            return json.loads(self._path(jid).read_text())
        except (OSError, ValueError):
            return None

    def save(self, st):
        p = self._path(st["id"])
        tmp = p.with_suffix(".tmp")
        tmp.write_text(json.dumps(st, indent=2))
        tmp.replace(p)

    def jd_text(self, jid) -> str:
        return (self.dir / jid / "jd.txt").read_text()

    def list(self):
        out = [st for d in self.dir.iterdir() if d.is_dir() and (st := self.load(d.name))]
        return sorted(out, key=lambda s: s["created"], reverse=True)

    def fail_interrupted(self):
        """Jobs left mid-run by a restart become errors, so the UI never spins forever."""
        for st in self.list():
            if st["status"] in ACTIVE:
                st["status"], st["error"] = "error", "server restarted mid-run; click retry"
                self.save(st)
