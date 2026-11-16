"""Paths and settings. The only module that reads environment variables."""
import os
import secrets
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Config:
    app_dir: Path
    bank_dir: Path
    claude_bin: str = str(Path.home() / ".local/bin/claude")
    gate_model: str = "haiku"
    gen_model: str = ""          # empty = the user's default model
    port: int = 8787
    skill_path: Path = Path.home() / ".claude/skills/job/SKILL.md"

    @property
    def jobs_dir(self): return self.app_dir / "jobs"
    @property
    def scratch_dir(self): return self.app_dir / "scratch"      # empty cwd: claude loads no project files
    @property
    def static_dir(self): return self.app_dir / "web" / "dist"      # the built React app
    @property
    def usage_log(self): return self.app_dir / "usage.log"
    @property
    def token_file(self): return self.app_dir / "token.txt"
    @property
    def confidential_file(self): return self.app_dir / "confidential.txt"
    @property
    def out_dir(self): return self.bank_dir / "out"
    @property
    def tracker_file(self): return self.bank_dir / "tracker.csv"
    @property
    def template_dir(self): return self.bank_dir / "template"


def load_config(app_dir: Path) -> Config:
    app_dir = Path(app_dir).resolve()
    return Config(
        app_dir=app_dir,
        bank_dir=app_dir.parent,
        claude_bin=os.environ.get("CLAUDE_BIN", Config.claude_bin),
        gate_model=os.environ.get("GATE_MODEL", "haiku"),
        gen_model=os.environ.get("GEN_MODEL", ""),
    )


def ensure_dirs(cfg: Config) -> None:
    cfg.jobs_dir.mkdir(exist_ok=True)
    cfg.scratch_dir.mkdir(exist_ok=True)


def load_token(cfg: Config) -> str:
    """The shared secret between the server, the dashboard and the Chrome extension."""
    if not cfg.token_file.exists():
        cfg.token_file.write_text(secrets.token_urlsafe(24))
        cfg.token_file.chmod(0o600)
    return cfg.token_file.read_text().strip()
