import tempfile
import unittest
from pathlib import Path

from jobdesk.store import JobStore, slugify


class StoreTest(unittest.TestCase):
    def setUp(self):
        self._d = tempfile.TemporaryDirectory()
        self.addCleanup(self._d.cleanup)
        self.store = JobStore(Path(self._d.name), clock=lambda: "2026-01-01 00:00:00")

    def test_create_then_load_roundtrip(self):
        st = self.store.create("job text " * 20, company=" Acme ", role="SDE", source="http://x")
        loaded = self.store.load(st["id"])
        self.assertEqual((loaded["company_hint"], loaded["role_hint"], loaded["status"]), ("Acme", "SDE", "queued"))
        self.assertEqual(self.store.jd_text(st["id"]), "job text " * 20)

    def test_hints_are_length_limited(self):
        st = self.store.create("x" * 100, company="c" * 500)
        self.assertEqual(len(st["company_hint"]), 80)

    def test_load_rejects_bad_ids(self):
        for bad in ("../etc", "", "abc", None, "20260101-000000-zzzz", "20260101-000000-abcd/../x"):
            self.assertIsNone(self.store.load(bad))

    def test_load_missing_is_none(self):
        self.assertIsNone(self.store.load("20260101-000000-abcd"))

    def test_list_is_newest_first(self):
        a = self.store.create("a" * 100)
        b = self.store.create("b" * 100)
        a["created"], b["created"] = "2026-01-01 10:00:00", "2026-01-02 10:00:00"
        self.store.save(a); self.store.save(b)
        self.assertEqual([s["id"] for s in self.store.list()], [b["id"], a["id"]])

    def test_fail_interrupted_marks_active_jobs(self):
        st = self.store.create("a" * 100)
        st["status"] = "generating"
        self.store.save(st)
        done = self.store.create("b" * 100)
        done["status"] = "done"
        self.store.save(done)
        self.store.fail_interrupted()
        self.assertEqual(self.store.load(st["id"])["status"], "error")
        self.assertEqual(self.store.load(done["id"])["status"], "done")


class SlugTest(unittest.TestCase):
    def test_slugify(self):
        self.assertEqual(slugify("Stripe — Software Engineer, New Grad!"), "stripe-software-engineer-new-grad")
        self.assertEqual(slugify(""), "job")
        self.assertEqual(len(slugify("a" * 200)), 60)


if __name__ == "__main__":
    unittest.main()
