"""Pure validation and scoring helpers. Code, not the model, decides these things."""
import difflib
import json
import re

# Obvious blockers never reach the model.
BLOCKERS = [
    r"u\.?s\.?\s+citizens?\s+only", r"must\s+be\s+(a\s+)?u\.?s\.?\s+citizen",
    r"citizens?\s+(or|and)\s+(lawful\s+)?permanent\s+residents?\s+only",
    r"(active\s+)?(secret|top\s+secret|ts/sci)\s+(security\s+)?clearance", r"security\s+clearance",
    r"\bitar\b", r"export\s+control", r"u\.?s\.?\s+person\b",
    r"(will|does)\s+not\s+(hire|consider|accept)[^.]{0,60}\b(f-?1|opt|visa|international)",
]
BANNED = ["spearhead", "leverag", "orchestrat", "utiliz", "robust", "seamless", "cutting-edge", "synergy",
          "passionate", "excited to"]
SECTION_ORDER = {"education": 0, "technical skills": 1, "experience": 2, "projects": 3}


def prefilter(jd):
    """The JD phrase that blocks him (visa or clearance rules), or None."""
    for pat in BLOCKERS:
        m = re.search(pat, jd, re.I)
        if m:
            i = max(0, m.start() - 40)
            return jd[i:m.end() + 40].replace("\n", " ").strip()
    return None


def blocker_gate(hit, company_hint="", role_hint=""):
    return {"company": company_hint or "Unknown", "role": role_hint or "Unknown", "eligibility": "Blocker",
            "eligibility_reason": f'"{hit}" (pre-filter, no model used)', "fit": "-", "met": [], "partly": [],
            "missing": [], "role_type": "-", "recommend": "skip", "summary": "Blocked by the free pre-filter."}


def norm(t):
    return re.sub(r"\s+", " ", t.replace("**", "")).strip()


def sort_sections(sections):
    """Education is always first (Nikhil's rule), then skills, experience, projects."""
    return sorted(sections, key=lambda s: SECTION_ORDER.get(str(s.get("title", "")).strip().lower(), 9))


def bank_bullets(bank_text):
    out = [norm(m[1]) for m in re.findall(r"^([ ]*)text: >-\n((?:\1[ ]+.*\n)+)", bank_text, re.M)]
    return out + [norm(m) for m in re.findall(r'text: "([^"\n]+)"', bank_text)]


def resume_bullets(resume):
    return [norm(b) for sec in resume["sections"] for e in sec.get("entries", []) for b in e.get("bullets", [])]


def auto_checks(resume, letter, mode, bank_text, confidential_terms=()):
    """(markdown report, number of warnings). Flags invented numbers, confidential names, banned words, rewording."""
    bank_nums = set(re.findall(r"\d[\d.,]*", bank_text.replace(",", "")))
    bullets = resume_bullets(resume)
    body = " ".join(bullets) + " " + letter
    issues = []
    for n in sorted(set(re.findall(r"\d[\d.,]*", body.replace(",", "")))):
        n = n.rstrip(".")
        if len(n) > 1 and not re.fullmatch(r"(19|20)\d\d", n) and n not in bank_nums:
            issues.append(f"number **{n}** is not in your bank")
    everything = body.lower() + " " + json.dumps(resume).lower()
    issues += [f"confidential term **{t}** appears" for t in confidential_terms if t in everything]
    issues += [f"banned word **{w}**" for w in BANNED if w in body.lower()]
    bank = bank_bullets(bank_text)
    verbatim, reworded = 0, []
    for b in bullets:
        if b in bank:
            verbatim += 1
        else:
            best = max(bank, key=lambda x: difflib.SequenceMatcher(None, b, x).ratio(), default="")
            reworded.append((best, b, difflib.SequenceMatcher(None, b, best).ratio()))
    if mode == "truthful" and reworded:
        issues.append(f"mode is truthful but {len(reworded)} bullet(s) differ from the bank")
    lines = ["## Automated checks (computed by code, not by the model)",
             f"- Mode: **{mode}**. Bullets: {len(bullets)} total, {verbatim} verbatim from the bank, {len(reworded)} reworded."]
    lines += [f"- ⚠ {i}" for i in issues] or ["- No invented numbers, confidential terms or banned words found."]
    for old, new, r in reworded:
        tag = "" if r > 0.55 else " (weak match: check this one is not new)"
        lines.append(f"- Reworded{tag}:\n  - before: {old}\n  - after: {new}")
    return "\n".join(lines), len(issues)


def keyword_details(raw_keywords, resume):
    """Normalise the model's keyword list and check, by whole-word search, which are in the resume."""
    hay = norm(json.dumps(resume["sections"], ensure_ascii=False) + " " + resume["subtitle"]).lower()
    has = lambda k: re.search(r"(?<![a-z0-9+#])" + re.escape(k.lower()) + r"(?![a-z0-9+#])", hay) is not None
    det = []
    for k in (raw_keywords or [])[:25]:
        if isinstance(k, str):
            k = {"term": k}
        if isinstance(k, dict) and str(k.get("term", "")).strip():
            d = {"term": str(k["term"]).strip(), "why": str(k.get("why") or ""), "yours": str(k.get("yours") or "")}
            d["in_resume"] = has(d["term"])
            det.append(d)
    return {"matched": [d["term"] for d in det if d["in_resume"]],
            "missing": [d["term"] for d in det if not d["in_resume"]], "details": det}


def count_pdf_pages(data: bytes) -> int:
    return len(re.findall(rb"/Type\s*/Page[^s]", data))
