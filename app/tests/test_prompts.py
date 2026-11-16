import unittest

from jobdesk import prompts
from tests.fakes import FakeKnowledge, JD

JOB = {"company": "Acme", "role": "SDE", "mode": "normal",
       "gate": {"eligibility": "Fine", "fit": "B", "role_type": "backend"}}


class PromptTest(unittest.TestCase):
    def setUp(self):
        self.facts = FakeKnowledge().facts()

    def test_gate_prompt_contains_inputs_and_untrusted_warning(self):
        p = prompts.gate_prompt(self.facts, JD, "Acme", "SDE")
        for s in ("BANK TEXT", "GATE RULES", JD, "Acme", "UNTRUSTED", "second person"):
            self.assertIn(s, p)

    def test_gen_prompt_has_mode_gate_and_facts(self):
        p = prompts.gen_prompt(self.facts, JD, JOB)
        for s in ("RULES TEXT", "GEN STEPS", "VOICE TEXT", "BANK TEXT", "NORMAL.", "eligibility=Fine", "Company: Acme"):
            self.assertIn(s, p)

    def test_each_mode_changes_the_prompt(self):
        texts = {m: prompts.gen_prompt(self.facts, JD, dict(JOB, mode=m)) for m in prompts.MODES}
        self.assertEqual(len(set(texts.values())), 3)
        self.assertIn("TRUTHFUL.", texts["truthful"])
        self.assertIn("AGGRESSIVE.", texts["aggressive"])
        self.assertIn("NEVER INVENT", texts["aggressive"])

    def test_default_mode_is_normal(self):
        job = {k: v for k, v in JOB.items() if k != "mode"}
        self.assertIn("NORMAL.", prompts.gen_prompt(self.facts, JD, job))

    def test_stable_facts_come_before_the_job_so_the_cache_can_be_reused(self):
        p = prompts.gen_prompt(self.facts, JD, JOB)
        self.assertLess(p.index("BANK TEXT"), p.index("Company: Acme"))
        self.assertLess(p.index("RULES TEXT"), p.index(JD))

    def test_trim_prompt(self):
        p = prompts.trim_prompt(2, {"subtitle": "x"})
        self.assertIn("2 pages", p)
        self.assertIn('"subtitle"', p)


if __name__ == "__main__":
    unittest.main()
