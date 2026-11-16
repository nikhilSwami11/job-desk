#!/usr/bin/env python3
"""Render a plain-text cover letter into a one-page PDF with the same header as the resume.

Usage: python3 -I render_letter.py <cover_letter.txt> <out_dir>
Paragraphs are separated by blank lines. The last paragraph block (name and contact) is kept as the sign-off.
"""
import html
import subprocess
import sys
from pathlib import Path

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
CSS = """
@page{size:Letter;margin:0.7in 0.8in}
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:"Liberation Sans","Helvetica Neue",Arial,sans-serif;font-size:10.8pt;line-height:1.5;color:#333;font-kerning:none;font-variant-ligatures:none}
h1{font-size:23pt;font-weight:700;letter-spacing:-.02em;line-height:1.1;color:#111}
.rule{height:2px;background:#1f4e9c;margin:6px 0 6px}
.contact{font-size:9pt;color:#555;margin-bottom:22px}
.contact span+span::before{content:"|";color:#ccc;margin:0 8px}
p{margin-bottom:12px}
.sign{margin-top:18px;white-space:pre-line}
"""


def main():
    src, out = Path(sys.argv[1]), Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    blocks = [b.strip() for b in src.read_text(encoding="utf-8").strip().split("\n\n")]
    body, sign = blocks[:-1], blocks[-1]
    lines = (Path(__file__).parent / "contact.txt").read_text(encoding="utf-8").strip().splitlines()
    contact = [c.strip() for c in lines[1].split("|")] if len(lines) > 1 else []
    page = ['<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Cover Letter</title>',
            f"<style>{CSS}</style></head><body>",
            "<h1>Nikhil Swami</h1><div class=\"rule\"></div>",
            '<div class="contact">' + "".join(f"<span>{html.escape(c)}</span>" for c in contact) + "</div>"]
    page += [f"<p>{html.escape(b)}</p>" for b in body]
    page.append(f'<p class="sign">{html.escape(sign)}</p></body></html>')
    (out / "cover_letter.html").write_text("\n".join(page), encoding="utf-8")
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
                    f"--print-to-pdf={out / 'Nikhil_Swami_Cover_Letter.pdf'}",
                    f"file://{out / 'cover_letter.html'}"], capture_output=True)
    print("wrote", out / "Nikhil_Swami_Cover_Letter.pdf")


if __name__ == "__main__":
    main()
