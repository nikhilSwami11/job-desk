import tempfile
import unittest
from pathlib import Path

from jobdesk.pipeline import Pipeline
from jobdesk.store import JobStore
from tests.fakes import FakeBuilder, FakeKnowledge, FakeLlm, GATE_JSON, GEN_JSON, JD, make_config

RESULT_1 = {"folder": "acme", "files": ["Nikhil_Swami_Resume.pdf"], "pages": 1, "review": "ok", "issues": 0,
            "score": {"overall": 7}, "keywords": {"matched": [], "missing": [], "details": []}}
RESULT_2 = dict(RESULT_1, pages=2, review="**WARNING: resume is 2 pages, target is 1.**\n\nok")


class PipelineBase(unittest.TestCase):
    def setUp(self):
        self._d = tempfile.TemporaryDirectory()
        self.addCleanup(self._d.cleanup)
        self.cfg = make_config(Path(self._d.name))
        self.store = JobStore(self.cfg.jobs_dir)

    def pipeline(self, replies, results=(), zoom=(1, 0.94)):
        self.llm, self.builder = FakeLlm(replies), FakeBuilder(results, zoom)
        return Pipeline(self.store, self.llm, self.builder, FakeKnowledge(), self.cfg)

    def new_job(self, jd=JD, **kw):
        return self.store.create(jd, **kw)

    def gated_job(self):
        st = self.new_job()
        st.update(status="gated", company="Acme", role="SDE", gate={"eligibility": "Fine", "fit": "B", "role_type": "backend"})
        self.store.save(st)
        return st["id"]


class GateTest(PipelineBase):
    def test_prefilter_skips_the_model_entirely(self):
        p = self.pipeline([])
        jid = self.new_job("This role is open to US citizens only. " * 5)["id"]
        p.run(jid, "gate")
        st = self.store.load(jid)
        self.assertEqual((st["status"], st["gate"]["eligibility"], st["cost"]), ("gated", "Blocker", 0))
        self.assertEqual(self.llm.calls, [])

    def test_model_gate_sets_company_and_role_and_uses_gate_model(self):
        p = self.pipeline([GATE_JSON])
        jid = self.new_job()["id"]
        p.run(jid, "gate")
        st = self.store.load(jid)
        self.assertEqual((st["status"], st["company"], st["role"]), ("gated", "Acme", "Backend Engineer"))
        self.assertEqual(self.llm.calls[0]["model"], "gate-model")
        self.assertEqual((st["tokens"], st["cost"]), (100, 0.01))

    def test_bad_reply_becomes_a_visible_error_and_cost_is_kept(self):
        p = self.pipeline(["sorry, no json here"])
        jid = self.new_job()["id"]
        p.run(jid, "gate")
        st = self.store.load(jid)
        self.assertEqual(st["status"], "error")
        self.assertIn("no JSON", st["error"])
        self.assertEqual(st["tokens"], 100)


class GenerateTest(PipelineBase):
    def test_success_marks_done_and_uses_gen_model(self):
        p = self.pipeline([GEN_JSON], [RESULT_1])
        jid = self.gated_job()
        p.run(jid, "generate")
        st = self.store.load(jid)
        self.assertEqual((st["status"], st["result"]["pages"]), ("done", 1))
        self.assertEqual(len(self.llm.calls), 1)
        self.assertEqual(self.llm.calls[0]["model"], "gen-model")
        self.assertEqual(self.builder.zoom_calls, 0)

    def test_small_overflow_is_fixed_by_zoom_without_a_second_model_call(self):
        p = self.pipeline([GEN_JSON], [RESULT_2], zoom=(1, 0.94))
        jid = self.gated_job()
        p.run(jid, "generate")
        st = self.store.load(jid)
        self.assertEqual((st["status"], st["result"]["pages"]), ("done", 1))
        self.assertIn("94% scale", st["result"]["review"])
        self.assertNotIn("WARNING", st["result"]["review"])
        self.assertEqual(len(self.llm.calls), 1)

    def test_big_overflow_asks_the_model_to_trim_once(self):
        p = self.pipeline([GEN_JSON, GEN_JSON], [RESULT_2, RESULT_1], zoom=(2, None))
        jid = self.gated_job()
        p.run(jid, "generate")
        st = self.store.load(jid)
        self.assertEqual((st["status"], st["result"]["pages"]), ("done", 1))
        self.assertEqual(len(self.llm.calls), 2)
        self.assertEqual(len(self.builder.builds), 2)
        self.assertIn("2 pages", self.llm.calls[1]["prompt"])

    def test_incomplete_reply_is_an_error(self):
        p = self.pipeline(['{"subtitle": "x"}'], [RESULT_1])
        jid = self.gated_job()
        p.run(jid, "generate")
        self.assertEqual(self.store.load(jid)["status"], "error")

    def test_builder_failure_is_an_error(self):
        class Boom(FakeBuilder):
            def build(self, *a):
                raise RuntimeError("resume PDF was not created")
        p = self.pipeline([GEN_JSON])
        p.builder = Boom([])
        jid = self.gated_job()
        p.run(jid, "generate")
        st = self.store.load(jid)
        self.assertEqual((st["status"], st["error"]), ("error", "resume PDF was not created"))


if __name__ == "__main__":
    unittest.main()
