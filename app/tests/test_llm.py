import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

from jobdesk.llm import ClaudeCli, LlmError, extract_json


class ExtractJsonTest(unittest.TestCase):
    def test_plain(self):
        self.assertEqual(extract_json('{"a": 1}'), {"a": 1})

    def test_fenced(self):
        self.assertEqual(extract_json('```json\n{"a": 1}\n```'), {"a": 1})

    def test_with_chatter(self):
        self.assertEqual(extract_json('Here you go: {"a": {"b": 2}} Hope that helps'), {"a": {"b": 2}})

    def test_no_json_raises(self):
        with self.assertRaises(ValueError):
            extract_json("sorry, I cannot")


def fake_runner(stdout, returncode=0, stderr=""):
    calls = []

    def run(cmd, **kw):
        calls.append((cmd, kw))
        return SimpleNamespace(stdout=stdout, stderr=stderr, returncode=returncode)
    run.calls = calls
    return run


OK = json.dumps({"result": "hi", "total_cost_usd": 0.05, "num_turns": 1,
                 "usage": {"input_tokens": 2, "output_tokens": 10, "cache_creation_input_tokens": 100, "cache_read_input_tokens": 50}})


class ClaudeCliTest(unittest.TestCase):
    def test_parses_text_cost_and_tokens(self):
        run = fake_runner(OK)
        r = ClaudeCli("claude", "/tmp", runner=run).complete("prompt", "system")
        self.assertEqual((r.text, r.cost, r.tokens), ("hi", 0.05, 162))

    def test_command_is_locked_down_and_prompt_goes_on_stdin(self):
        run = fake_runner(OK)
        ClaudeCli("claude", "/tmp/scratch", runner=run).complete("the prompt", "the system", model="haiku")
        cmd, kw = run.calls[0]
        for flag in ("--tools", "--strict-mcp-config", "--disable-slash-commands", "--no-session-persistence"):
            self.assertIn(flag, cmd)
        self.assertEqual(cmd[cmd.index("--tools") + 1], "")
        self.assertEqual(cmd[cmd.index("--model") + 1], "haiku")
        self.assertEqual(kw["input"], "the prompt")
        self.assertEqual(kw["cwd"], "/tmp/scratch")

    def test_no_model_flag_when_model_empty(self):
        run = fake_runner(OK)
        ClaudeCli("claude", "/tmp", runner=run).complete("p", "s", model="")
        self.assertNotIn("--model", run.calls[0][0])

    def test_nonzero_exit_raises(self):
        with self.assertRaises(LlmError):
            ClaudeCli("claude", "/tmp", runner=fake_runner("", returncode=1, stderr="boom")).complete("p", "s")

    def test_error_flag_raises(self):
        with self.assertRaises(LlmError):
            ClaudeCli("claude", "/tmp", runner=fake_runner(json.dumps({"is_error": True, "result": "limit"}))).complete("p", "s")

    def test_non_json_stdout_raises(self):
        with self.assertRaises(LlmError):
            ClaudeCli("claude", "/tmp", runner=fake_runner("not json")).complete("p", "s")

    def test_usage_is_logged(self):
        with tempfile.TemporaryDirectory() as d:
            log = Path(d) / "usage.log"
            ClaudeCli("claude", "/tmp", usage_log=log, runner=fake_runner(OK), clock=lambda: "T").complete("prompt!", "s")
            row = json.loads(log.read_text())
            self.assertEqual((row["t"], row["prompt_chars"], row["cost"]), ("T", 7, 0.05))


if __name__ == "__main__":
    unittest.main()
