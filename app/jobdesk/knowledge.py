"""Reads the user's facts from disk. Nothing here builds prompts or calls a model."""
import json
import re
from dataclasses import dataclass
from pathlib import Path

DROP_LINES = re.compile(r"python3 -I|print_pdf|pdftext|pdfpng|textutil|swift |Chrome|Do NOT use|ALWAYS verify|To look at the PDF")


def section(text, start, end=None):
    i = text.index(start)
    j = text.index(end, i + 1) if end else len(text)
    return text[i:j]


@dataclass
class Facts:
    bank: str          # bank.yaml, the only source of facts
    rules: str         # RULES.md
    voice: str         # voice.md + corrections.md
    gate_rules: str    # who he is + gate rules, from the /job skill
    gen_steps: str     # resume and cover letter rules, from the /job skill
    example_shape: dict  # a sample resume.json (subtitle + sections) to show the shape


class Knowledge:
    def __init__(self, bank_dir: Path, skill_path: Path, confidential_file: Path):
        self.bank_dir, self.skill_path, self.confidential_file = Path(bank_dir), Path(skill_path), Path(confidential_file)

    def facts(self) -> Facts:
        skill = self.skill_path.read_text()
        steps = section(skill, "## Step 2", "## Step 4")
        steps = "\n".join(l for l in steps.splitlines() if not DROP_LINES.search(l))
        ex = json.loads((self.bank_dir / "out/uno-wallet-software-engineer/resume.json").read_text())
        return Facts(
            bank=(self.bank_dir / "bank.yaml").read_text(),
            rules=(self.bank_dir / "RULES.md").read_text(),
            voice=(self.bank_dir / "voice/voice.md").read_text() + "\n" + (self.bank_dir / "voice/corrections.md").read_text(),
            gate_rules=section(skill, "## Who he is", "## Step 2"),
            gen_steps=steps,
            example_shape={"subtitle": ex["subtitle"], "sections": ex["sections"]})

    def contact(self):
        """(name, [contact items]) for the resume header."""
        name, line = [x.strip() for x in (self.bank_dir / "template/contact.txt").read_text().strip().splitlines()[:2]]
        return name, [c.strip() for c in line.split("|")]

    def confidential_terms(self):
        try:
            return [t.strip().lower() for t in self.confidential_file.read_text().splitlines() if t.strip()]
        except OSError:
            return []
