#!/usr/bin/env python3
"""Entry point. Wires the layers together and serves on 127.0.0.1 only.

Run:  python3 -I app/server.py
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))   # -I does not add the script folder, so do it explicitly

from jobdesk import config as cfgmod                       # noqa: E402
from jobdesk.api import App, make_server                   # noqa: E402
from jobdesk.artifacts import ArtifactBuilder              # noqa: E402
from jobdesk.knowledge import Knowledge                    # noqa: E402
from jobdesk.llm import ClaudeCli                          # noqa: E402
from jobdesk.pipeline import Pipeline                      # noqa: E402
from jobdesk.store import JobStore, now                    # noqa: E402


def build_app():
    cfg = cfgmod.load_config(HERE)
    cfgmod.ensure_dirs(cfg)
    token = cfgmod.load_token(cfg)
    knowledge = Knowledge(cfg.bank_dir, cfg.skill_path, cfg.confidential_file)
    store = JobStore(cfg.jobs_dir)
    store.fail_interrupted()
    llm = ClaudeCli(cfg.claude_bin, cfg.scratch_dir, cfg.usage_log, clock=now)
    pipeline = Pipeline(store, llm, ArtifactBuilder(cfg, knowledge), knowledge, cfg)
    return App(cfg, store, pipeline, token)


if __name__ == "__main__":
    app = build_app()
    if not (app.cfg.static_dir / "index.html").is_file():
        print("NOTE: the frontend is not built yet. Run:  cd app/web && npm install && npm run build")
    print(f"Job Desk on http://127.0.0.1:{app.cfg.port}  (token in {app.cfg.token_file})")
    make_server(app, app.cfg.port).serve_forever()
