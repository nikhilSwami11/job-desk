#!/usr/bin/env python3
"""Render resume.json into resume.html (for the PDF) and a Word .docx with real right-aligned tab stops.

Usage: python3 -I render_resume.py <resume.json> <out_dir>
Text may contain **bold** markers; use them for job-description keywords that are true for Nikhil.
No third-party packages: the .docx is written by hand with zipfile.
"""
import html
import json
import re
import sys
import zipfile
from pathlib import Path

ACCENT = "1F4E9C"
INK = "111111"
BODY = "333333"
GRAY = "777777"
TEXT_WIDTH = 10656  # twips: Letter 8.5in minus 0.55in margins


def esc(s):
    return html.escape(s, quote=False)


def split_bold(text):
    """'a **b** c' -> [('a ',False),('b',True),(' c',False)]"""
    out = []
    for i, part in enumerate(re.split(r"\*\*", text)):
        if part:
            out.append((part, i % 2 == 1))
    return out


# ---------------------------------------------------------------- HTML
def html_inline(text):
    return "".join(f'<b class="kw">{esc(t)}</b>' if b else esc(t) for t, b in split_bold(text))


def build_html(data, css):
    o = []
    o.append('<!DOCTYPE html>\n<html lang="en"><head><meta charset="utf-8">'
             f'<title>{esc(data["name"])} Resume</title>\n<style>\n{css}\n</style></head><body>')
    o.append(f'<h1>{esc(data["name"])}</h1>')
    o.append(f'<div class="sub">{esc(data["subtitle"])}</div>')
    o.append('<div class="grad"></div>')
    o.append('<div class="contact">' + "".join(f"<span>{esc(c)}</span>" for c in data["contact"]) + "</div>")
    for sec in data["sections"]:
        o.append(f'<h2>{esc(sec["title"])}</h2>')
        if "lines" in sec:
            o.append('<div class="skills">')
            for ln in sec["lines"]:
                o.append(f'<p><b>{esc(ln["label"])}:</b> {html_inline(ln["text"])}</p>')
            o.append("</div>")
            continue
        for e in sec["entries"]:
            o.append('<div class="entry">')
            o.append(f'<div class="row"><span class="org">{esc(e["org"])}</span><span class="when">{esc(e["when"])}</span></div>')
            if e.get("role"):
                cls = "role" if sec["title"] == "Experience" else "plain"
                o.append(f'<div class="{cls}">{esc(e["role"])}</div>')
            if e.get("tech"):
                o.append(f'<div class="tech">{esc(e["tech"])}</div>')
            if e.get("bullets"):
                o.append("<ul>" + "".join(f"<li>{html_inline(b)}</li>" for b in e["bullets"]) + "</ul>")
            o.append("</div>")
    o.append("</body></html>")
    return "\n".join(o)


# ---------------------------------------------------------------- DOCX
def rpr(bold=False, italic=False, caps=False, color=None, size=None):
    x = '<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>'
    if bold:
        x += "<w:b/>"
    if italic:
        x += "<w:i/>"
    if caps:
        x += "<w:caps/>"
    if color:
        x += f'<w:color w:val="{color}"/>'
    if size:
        x += f'<w:sz w:val="{size}"/><w:szCs w:val="{size}"/>'
    return f"<w:rPr>{x}</w:rPr>"


def run(text, **kw):
    return f'<w:r>{rpr(**kw)}<w:t xml:space="preserve">{esc(text)}</w:t></w:r>'


def tab_run(**kw):
    return f"<w:r>{rpr(**kw)}<w:tab/></w:r>"


def para(runs, ppr=""):
    return f"<w:p><w:pPr>{ppr}</w:pPr>{runs}</w:p>"


def rich_runs(text, size, color):
    return "".join(run(t, bold=b, color=INK if b else color, size=size) for t, b in split_bold(text))


def build_docx(data, path):
    body = []
    body.append(para(run(data["name"], bold=True, color=INK, size=46),
                     '<w:spacing w:before="0" w:after="0"/>'))
    body.append(para(run(data["subtitle"], bold=True, caps=True, color=ACCENT, size=21),
                     f'<w:pBdr><w:bottom w:val="single" w:sz="12" w:space="3" w:color="{ACCENT}"/></w:pBdr>'
                     '<w:spacing w:before="30" w:after="80"/>'))
    body.append(para(run("  |  ".join(data["contact"]), color="555555", size=18),
                     '<w:spacing w:before="0" w:after="40"/>'))
    for sec in data["sections"]:
        body.append(para(run(sec["title"], bold=True, caps=True, color=ACCENT, size=21),
                          '<w:keepNext/><w:pBdr><w:bottom w:val="single" w:sz="8" w:space="1" w:color="E2E2E2"/></w:pBdr>'
                          '<w:spacing w:before="140" w:after="70"/>'))
        if "lines" in sec:
            for ln in sec["lines"]:
                body.append(para(run(ln["label"] + ": ", bold=True, color=ACCENT, size=19) + rich_runs(ln["text"], 19, BODY),
                                 '<w:spacing w:before="0" w:after="20"/>'))
            continue
        for e in sec["entries"]:
            body.append(para(run(e["org"], bold=True, color=INK, size=20) + tab_run(size=18) + run(e["when"], color=GRAY, size=18),
                             f'<w:keepNext/><w:tabs><w:tab w:val="right" w:pos="{TEXT_WIDTH}"/></w:tabs>'
                             '<w:spacing w:before="70" w:after="0"/>'))
            if e.get("role"):
                is_job = sec["title"] == "Experience"
                body.append(para(run(e["role"], bold=is_job, color=BODY, size=19),
                                 '<w:keepNext/><w:spacing w:before="0" w:after="10"/>' if e.get("bullets") or e.get("tech") else '<w:spacing w:before="0" w:after="10"/>'))
            if e.get("tech"):
                body.append(para(run(e["tech"], color=GRAY, size=17), '<w:keepNext/><w:spacing w:before="0" w:after="10"/>'))
            for b in e.get("bullets", []):
                body.append(para(rich_runs(b, 19, BODY),
                                 '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>'
                                 '<w:spacing w:before="0" w:after="20"/><w:ind w:left="300" w:hanging="200"/>'))
    sect = ('<w:sectPr><w:pgSz w:w="12240" w:h="15840"/>'
            '<w:pgMar w:top="576" w:right="792" w:bottom="576" w:left="792" w:header="360" w:footer="360" w:gutter="0"/></w:sectPr>')
    document = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
                f'<w:body>{"".join(body)}{sect}</w:body></w:document>')
    styles = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
              '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
              '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>'
              '<w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr></w:rPrDefault>'
              '<w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="252" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>'
              '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>')
    numbering = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                 '<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
                 '<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>'
                 '<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="&#8226;"/><w:lvlJc w:val="left"/>'
                 '<w:pPr><w:ind w:left="300" w:hanging="200"/></w:pPr>'
                 '<w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/></w:rPr></w:lvl></w:abstractNum>'
                 '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>')
    content_types = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                     '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                     '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                     '<Default Extension="xml" ContentType="application/xml"/>'
                     '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
                     '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
                     '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>'
                     '</Types>')
    rels = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
            '</Relationships>')
    doc_rels = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
                '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>'
                '</Relationships>')
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", content_types)
        z.writestr("_rels/.rels", rels)
        z.writestr("word/document.xml", document)
        z.writestr("word/styles.xml", styles)
        z.writestr("word/numbering.xml", numbering)
        z.writestr("word/_rels/document.xml.rels", doc_rels)


def main():
    src, out = Path(sys.argv[1]), Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    data = json.loads(src.read_text(encoding="utf-8"))
    tpl = (Path(__file__).parent / "resume-style.html").read_text(encoding="utf-8")
    css = re.search(r"<style>(.*?)</style>", tpl, re.S).group(1).strip()
    css += "\n.plain{margin-bottom:1px}\n.skills p>b:first-child{color:var(--accent)}"
    (out / "resume.html").write_text(build_html(data, css), encoding="utf-8")
    build_docx(data, out / "Nikhil_Swami_Resume.docx")
    print("wrote resume.html and Nikhil_Swami_Resume.docx in", out)


if __name__ == "__main__":
    main()
