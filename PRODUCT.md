# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One person: Nikhil Swami, an international new grad (MS Computer Science, ASU) on F-1 OPT applying for entry-level software engineer roles. He uses it by himself, on a laptop and on his phone's browser, in daylight and late at night. He wants to move fast through many applications without sending anything he has not checked.

## Product Purpose

Job Desk is Nikhil's personal desk. Today it does one job well: paste a job description (or send it from a Chrome extension), get a visa and fit check, pick how hard to tailor, and get a tailored one-page resume and cover letter with a 0-10 match score and keyword coverage. It is meant to grow into the single place for his workflow: job applications, email that needs action, to-dos and tasks, and ideas from Instagram reels turned into implementation plans. Success is that he goes from a pasted job to downloaded files in about a minute, always knows the next action, and never feels the tool is hiding or flattering anything.

## Positioning

A private, local, truthful assistant: it works only from his own facts bank, never invents skills, shows gaps and a strict score, and never sends or submits anything for him. Nothing leaves his machine except the model call.

## Operating Context

A small Python server runs on his Mac (127.0.0.1:8787) and serves one HTML file. Each step calls Claude through the `claude -p` CLI. A Chrome extension sends job pages to the same server. Data lives in files: `app/jobs/<id>/state.json` per job, `tracker.csv`, and `out/<job>/` for generated files. A Telegram bot for texting commands from his phone is planned later.

## Capabilities and Constraints

Working today (must keep working, same API): paste a job (POST /api/jobs with jd, optional company, role, url), poll GET /api/jobs every few seconds, per job POST /api/jobs/<id>/generate (body {mode}) and /retry, download files from /files/<id>/<name>?t=TOKEN. The server injects the token by replacing the literal `__TOKEN__` in the HTML; send it as header X-Token. Job statuses: queued, gating, gated, generating, done, error. A job has gate (eligibility Fine/Caution/Blocker with reason, fit grade A-F, met/partly/missing lists, role_type, recommend go/skip), result (folder, files, pages, review markdown, issues count, score {overall, skills, experience, level, one_line}, keywords {matched, missing, details[{term, why, yours, in_resume}]}), mode, tokens, cost. Tailoring modes: truthful, normal, aggressive. Files: Nikhil_Swami_Resume.pdf, Nikhil_Swami_Cover_Letter.pdf, Nikhil_Swami_Resume.docx, cover_letter.txt. The status in his tracker is "drafted"; he sends applications himself.
Not built yet, so any screen for them is a design placeholder with clearly synthetic sample content: Mail (what needs action), Tasks (to-dos), Reels (share a link plus caption, get an implementation plan).
Single self-contained HTML file, no external libraries or hosted fonts (it is served locally and must work offline).

## Brand Commitments

Name for now: Job Desk. No logo or brand assets exist.

## Evidence on Hand

Real jobs exist in `app/jobs/*/state.json` (test jobs for Acme Payments and Stripe). There is no real mail, task or reel data yet; do not present invented data as real.

## Product Principles

1. The next action is always obvious: at any moment one thing is the thing to do.
2. Truth over flattery: the verdict, the strict score and the gaps are as prominent as the good news.
3. Fast and calm for daily use: effects never slow a repeated task.
4. Phone-ready: everything important works on a small screen.
5. Creative but intuitive: it should not look like a generic dashboard, and it must never need explaining.

## Accessibility & Inclusion

Light and dark themes (follows the system, both must be first-class). Works from small phone widths up. Text contrast must meet WCAG AA. Respect reduced motion.
