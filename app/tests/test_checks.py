import unittest

from jobdesk import checks

BANK = """experience:
  - bullets:
      - id: a
        text: >-
          Built a Go report service that cut latency by 20% for 7 roles.
        tech: [Go]
      - id: b
        text: "Made catalog search 30% faster with MSSQL indexing."
"""


def resume(*bullets):
    return {"subtitle": "Software Engineer", "sections": [
        {"title": "Experience", "entries": [{"org": "Acme", "bullets": list(bullets)}]}]}


class PrefilterTest(unittest.TestCase):
    def test_blocks_citizens_only(self):
        self.assertIn("citizens only", checks.prefilter("Role open to US citizens only, no exceptions.").lower())

    def test_blocks_clearance_and_itar(self):
        self.assertTrue(checks.prefilter("Must hold an active security clearance."))
        self.assertTrue(checks.prefilter("Work is subject to ITAR."))

    def test_blocks_no_f1(self):
        self.assertTrue(checks.prefilter("We will not hire candidates on F-1 visas."))

    def test_allows_normal_and_opt_friendly(self):
        self.assertIsNone(checks.prefilter("Build APIs in Go. We welcome F-1 OPT candidates."))
        self.assertIsNone(checks.prefilter("Must be authorized to work in the US."))

    def test_blocker_gate_shape(self):
        g = checks.blocker_gate("US citizens only", "Acme", "")
        self.assertEqual((g["eligibility"], g["recommend"], g["role"]), ("Blocker", "skip", "Unknown"))
        self.assertIn("no model used", g["eligibility_reason"])


class SectionsTest(unittest.TestCase):
    def test_education_first(self):
        secs = [{"title": "Projects"}, {"title": "Experience"}, {"title": "Technical Skills"}, {"title": "Education"}]
        self.assertEqual([s["title"] for s in checks.sort_sections(secs)],
                         ["Education", "Technical Skills", "Experience", "Projects"])

    def test_unknown_section_goes_last_and_case_is_ignored(self):
        secs = [{"title": "Awards"}, {"title": "education"}]
        self.assertEqual([s["title"] for s in checks.sort_sections(secs)], ["education", "Awards"])


class BankBulletsTest(unittest.TestCase):
    def test_reads_folded_and_quoted_text(self):
        b = checks.bank_bullets(BANK)
        self.assertIn("Built a Go report service that cut latency by 20% for 7 roles.", b)
        self.assertIn("Made catalog search 30% faster with MSSQL indexing.", b)
        self.assertFalse(any("tech:" in x for x in b))


class AutoChecksTest(unittest.TestCase):
    def run_checks(self, r, letter="Thanks.", mode="normal", terms=()):
        return checks.auto_checks(r, letter, mode, BANK, terms)

    def test_clean_verbatim_resume_has_no_issues(self):
        report, n = self.run_checks(resume("Built a Go report service that cut latency by 20% for 7 roles."))
        self.assertEqual(n, 0)
        self.assertIn("1 verbatim", report)

    def test_flags_invented_number(self):
        _, n = self.run_checks(resume("Cut latency by 47% for 7 roles."))
        self.assertEqual(n, 1)

    def test_years_and_single_digits_are_not_flagged(self):
        _, n = self.run_checks(resume("Built a Go report service that cut latency by 20% for 7 roles."), letter="Since 2024, 3 teams.")
        self.assertEqual(n, 0)

    def test_flags_banned_word(self):
        report, n = self.run_checks(resume("Leveraged Go to cut latency by 20%."))
        self.assertGreaterEqual(n, 1)
        self.assertIn("banned word", report)

    def test_flags_confidential_term_anywhere(self):
        report, n = self.run_checks(resume("Built a Go service."), letter="I worked with SecretCo.", terms=["secretco"])
        self.assertEqual(n, 1)
        self.assertIn("confidential", report)

    def test_truthful_mode_flags_rewording(self):
        _, n = self.run_checks(resume("Built a Go report service."), mode="truthful")
        self.assertGreaterEqual(n, 1)

    def test_reworded_bullet_is_listed_with_before_and_after(self):
        report, _ = self.run_checks(resume("Built a Go report service that reduced latency by 20% for 7 roles."))
        self.assertIn("before:", report)
        self.assertIn("after:", report)


class KeywordTest(unittest.TestCase):
    def test_java_is_not_matched_by_javascript(self):
        r = resume("Wrote JavaScript and TypeScript.")
        k = checks.keyword_details([{"term": "Java"}, {"term": "JavaScript"}], r)
        self.assertEqual((k["matched"], k["missing"]), (["JavaScript"], ["Java"]))

    def test_symbols_in_terms(self):
        r = resume("Used C++ and C#.")
        k = checks.keyword_details(["C", "C++", "C#"], r)
        self.assertEqual(sorted(k["matched"]), ["C#", "C++"])
        self.assertEqual(k["missing"], ["C"])

    def test_accepts_strings_and_fills_defaults(self):
        k = checks.keyword_details(["Go"], resume("Built in Go."))
        self.assertEqual(k["details"][0], {"term": "Go", "why": "", "yours": "", "in_resume": True})

    def test_ignores_junk_entries_and_handles_none(self):
        self.assertEqual(checks.keyword_details(None, resume("x"))["details"], [])
        self.assertEqual(checks.keyword_details([{"term": " "}, 5, None], resume("x"))["details"], [])

    def test_caps_at_25(self):
        many = [{"term": f"t{i}"} for i in range(40)]
        self.assertEqual(len(checks.keyword_details(many, resume("x"))["details"]), 25)


class PdfPagesTest(unittest.TestCase):
    def test_counts_pages_not_page_tree(self):
        data = b"<< /Type /Pages >> << /Type /Page\n >> << /Type /Page >>"
        self.assertEqual(checks.count_pdf_pages(data), 2)


if __name__ == "__main__":
    unittest.main()
