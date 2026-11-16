"""Turns the model's JSON into files: resume.json, Word, PDF, cover letter. All shelling-out lives here."""
import json
import subprocess
from pathlib import Path

from . import checks, tracker
from .store import slugify

FILES = ["Nikhil_Swami_Resume.pdf", "Nikhil_Swami_Resume.docx", "Nikhil_Swami_Cover_Letter.pdf", "cover_letter.txt", "resume.json"]
ZOOMS = (0.98, 0.96, 0.94, 0.92)


def default_run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True, timeout=120)


class ArtifactBuilder:
    def __init__(self, config, knowledge, run=default_run):
        self.cfg, self.knowledge, self.run = config, knowledge, run

    def _pages(self, pdf: Path):
        return checks.count_pdf_pages(pdf.read_bytes())

    def build(self, job, reply, bank_text):
        slug = slugify(f"{job['company']}-{job['role']}")
        out = self.cfg.out_dir / slug
        out.mkdir(parents=True, exist_ok=True)
        name, contact = self.knowledge.contact()
        resume = {"name": name, "subtitle": reply["subtitle"], "contact": contact,
                  "sections": checks.sort_sections(reply["sections"])}
        (out / "resume.json").write_text(json.dumps(resume, indent=2, ensure_ascii=False))
        (out / "cover_letter.txt").write_text(reply["cover_letter"].strip() + "\n")
        t = self.cfg.template_dir
        p = self.run(["python3", "-I", str(t / "render_resume.py"), str(out / "resume.json"), str(out)])
        if p.returncode:
            raise RuntimeError("render_resume failed: " + (p.stderr or p.stdout)[-300:])
        self.run([str(t / "print_pdf.sh"), str(out / "resume.html"), str(out / "Nikhil_Swami_Resume.pdf")])
        self.run(["python3", "-I", str(t / "render_letter.py"), str(out / "cover_letter.txt"), str(out)])
        pdf = out / "Nikhil_Swami_Resume.pdf"
        if not pdf.exists():
            raise RuntimeError("resume PDF was not created")
        pages = self._pages(pdf)
        tracker.record(self.cfg.tracker_file, job, f"out/{slug}")
        report, issues = checks.auto_checks(resume, reply["cover_letter"], job.get("mode", "normal"), bank_text,
                                            self.knowledge.confidential_terms())
        review = (reply.get("review") or "") + "\n\n" + report
        if pages != 1:
            review = f"**WARNING: resume is {pages} pages, target is 1.**\n\n" + review
        return {"folder": slug, "files": [f for f in FILES if (out / f).exists()], "pages": pages, "review": review,
                "issues": issues, "score": reply.get("score"),
                "keywords": checks.keyword_details(reply.get("jd_keywords"), resume)}

    def fit_by_zoom(self, slug):
        """Free fix for a small overflow: print at 98%..92% scale until the resume is one page. Returns (pages, zoom)."""
        out = self.cfg.out_dir / slug
        html, pdf = out / "resume.html", out / "Nikhil_Swami_Resume.pdf"
        base = html.read_text()
        script = str(self.cfg.template_dir / "print_pdf.sh")
        for z in ZOOMS:
            tmp = out / "_fit.html"
            tmp.write_text(base.replace("</head>", f"<style>html{{zoom:{z}}}</style></head>", 1))
            self.run([script, str(tmp), str(pdf)])
            tmp.unlink(missing_ok=True)
            if self._pages(pdf) == 1:
                return 1, z
        self.run([script, str(html), str(pdf)])
        return self._pages(pdf), None
