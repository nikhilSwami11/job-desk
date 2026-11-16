"""The only module that talks to the Claude CLI. Everything else depends on the small `complete` interface."""
import json
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path


class LlmError(RuntimeError):
    pass


@dataclass
class LlmResult:
    text: str
    cost: float = 0.0
    tokens: int = 0


def extract_json(text: str):
    """Parse the model's reply: plain JSON, fenced JSON, or JSON with chatter around it."""
    text = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.M).strip()
    try:
        return json.loads(text)
    except ValueError:
        m = re.search(r"\{.*\}", text, re.S)
        if not m:
            raise ValueError("no JSON in reply: " + text[:200])
        return json.loads(m.group(0))


class ClaudeCli:
    """One headless call: no tools, no MCP servers, no project files, so a call costs only what we put in the prompt."""

    def __init__(self, claude_bin, cwd, usage_log: Path = None, runner=subprocess.run, clock=lambda: ""):
        self.bin, self.cwd, self.usage_log, self.runner, self.clock = claude_bin, cwd, usage_log, runner, clock

    def complete(self, prompt, system, model="", timeout=300) -> LlmResult:
        cmd = [self.bin, "-p", "--tools", "", "--disable-slash-commands", "--no-session-persistence",
               "--strict-mcp-config", "--system-prompt", system, "--output-format", "json"]
        if model:
            cmd += ["--model", model]
        p = self.runner(cmd, input=prompt, cwd=self.cwd, capture_output=True, text=True, timeout=timeout)
        if p.returncode != 0:
            raise LlmError((p.stderr or p.stdout or "claude failed")[-600:])
        try:
            out = json.loads(p.stdout)
        except ValueError:
            raise LlmError("claude returned something that is not JSON: " + p.stdout[:200])
        if out.get("is_error"):
            raise LlmError(str(out.get("result"))[:600])
        usage = out.get("usage", {})
        tokens = sum(usage.get(k, 0) for k in ("input_tokens", "output_tokens",
                                               "cache_creation_input_tokens", "cache_read_input_tokens"))
        if self.usage_log:
            with open(self.usage_log, "a") as f:
                f.write(json.dumps({"t": self.clock(), "model": model or "default", "turns": out.get("num_turns"),
                                    "usage": usage, "cost": out.get("total_cost_usd"), "prompt_chars": len(prompt)}) + "\n")
        return LlmResult(out.get("result", ""), out.get("total_cost_usd") or 0.0, tokens)
