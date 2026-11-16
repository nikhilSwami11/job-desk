"""Test doubles: the boundaries (model, file rendering, facts) are replaced so tests are fast and offline."""
from pathlib import Path

from jobdesk.config import Config
from jobdesk.knowledge import Facts
from jobdesk.llm import LlmResult


def make_config(tmp: Path) -> Config:
    (tmp / "jobs").mkdir(exist_ok=True)
    (tmp / "static").mkdir(exist_ok=True)
    return Config(app_dir=tmp, bank_dir=tmp, claude_bin="claude-fake", gate_model="gate-model", gen_model="gen-model")


class FakeLlm:
    def __init__(self, replies, cost=0.01, tokens=100):
        self.replies, self.cost, self.tokens, self.calls = list(replies), cost, tokens, []

    def complete(self, prompt, system, model="", timeout=300):
        self.calls.append({"prompt": prompt, "system": system, "model": model})
        return LlmResult(self.replies.pop(0), self.cost, self.tokens)


class FakeKnowledge:
    def facts(self):
        return Facts(bank="BANK TEXT", rules="RULES TEXT", voice="VOICE TEXT", gate_rules="GATE RULES",
                     gen_steps="GEN STEPS", example_shape={"subtitle": "Example", "sections": []})

    def contact(self):
        return "Test Person", ["City", "me@example.com"]

    def confidential_terms(self):
        return ["secretco"]


class FakeBuilder:
    def __init__(self, results, zoom=(1, 0.94)):
        self.results, self.zoom, self.builds, self.zoom_calls = list(results), zoom, [], 0

    def build(self, job, reply, bank_text):
        self.builds.append(reply)
        return dict(self.results.pop(0))

    def fit_by_zoom(self, slug):
        self.zoom_calls += 1
        return self.zoom


class FakePipeline:
    def __init__(self):
        self.started = []

    def start(self, jid, phase):
        self.started.append((jid, phase))


GATE_JSON = ('{"company": "Acme", "role": "Backend Engineer", "eligibility": "Fine", "eligibility_reason": "JD is silent", '
             '"fit": "B", "met": ["Go"], "partly": [], "missing": [], "role_type": "backend", "recommend": "go", "summary": "ok"}')
GEN_JSON = ('{"subtitle": "Backend Engineer", "sections": [{"title": "Education", "entries": []}], '
            '"cover_letter": "Hi.\\n\\nThanks,\\nTest Person", "review": "- ok", "jd_keywords": [], '
            '"score": {"overall": 7, "skills": 7, "experience": 7, "level": 7, "one_line": "fine"}}')
JD = "We are hiring a backend engineer to build payment APIs in Go and Python. " * 3
