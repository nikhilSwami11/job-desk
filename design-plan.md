# Job Desk redesign plan (for approval, nothing built yet)

Assumptions (I could not ask): I kept the "marked-up page" direction already recorded in `.impeccable/surfaces/app-dashboard-html.md`. Same server API, same single file `app/dashboard.html`.

## 1. The big idea

**The desk is a page of notes someone already went over with a highlighter and a red pen:** yellow marks the one thing to do next, green marks what you have, red pen marks what is missing. A job description is a document you check yourself against; a marked-up page cannot flatter you.

Refused: grey cards, status pills, stat tiles and progress bars, all equally loud.

## 2. Navigation and layout

- **Phone:** four labelled bottom tabs (Jobs, Mail, Tasks, Reels), in thumb reach. A job opens as its own screen with a back arrow; its main button stays pinned above the tabs.
- **Laptop:** ink-blue left rail with the same four. Middle: job list. Right: the open job. No pop-ups.
- **Home shows first:** one plain "next step" sentence with the action words highlighted yellow and tappable, e.g. "Acme is ready to **download**." or "Nothing waiting. **Paste a job.**" Priority: problem, needs go-ahead, ready to download, paste.
- Under it: the paste box, then job rows. Each row: company, role, state in words, and the score (or grade) in a fixed right column.

## 3. Jobs flow

Every job screen carries a three-stage track: Check, Build, Download.

| Screen | What is on it | The one next action |
|---|---|---|
| **New job** | Big paste box. "Add company, role or link" folded away. | **Check fit** (yellow) |
| **Checking** | "Checking visa and fit…", first lines of the job, "You can leave, you will be notified." | None. Wait. |
| **Verdict: go** | Headline "Worth applying" in green highlighter. Under it: "Can you apply?" (OK / Check first / Likely blocked, plus reason) and the fit grade marked on an A to F ruler. Then You have (green), Partly (amber), Missing (red underline). | Pick a mode just below, then build |
| **Tailoring mode** | Same screen. Three choices, one line each: Truthful, Normal (recommended), Aggressive. Last pick remembered. | **Build resume and cover letter** (yellow). "About a minute. Nothing is sent." |
| **Building** | Calm progress line; verdict still readable. | None. Wait. |
| **Done** | Biggest thing on the page: the score, e.g. **6/10**, as a marker stroke on a ruled 0 to 10 scale. Thin strokes for Skills, Experience, Level. The one-line reason. "Keywords: 4 of 20", matched in green, missing underlined red, tap one for why. Warnings (things to double-check, over one page) sit right above the button. "What changed" notes fold away. | **Download resume (PDF)** (yellow). Other three files are plain buttons. Footer: mode, "drafted", "You send it yourself", tokens, cost. |
| **Error** | Red-pen note with the real error. | **Try again** |
| **Skip / blocked** | Headline "Skip this one" in red pen, reason first (visa blocker or low grade), gaps listed. | **Move on** (folds the job away). "Build anyway" is a small link. |

**Unmissable score and verdict:** the verdict is always the largest sentence, in words plus highlighter, never colour alone. The score is always the largest number and repeats in the job row. Low scores are as big as high ones.

## 4. Mail, Tasks, Reels (sample only)

Each carries a striped strip: "Sample screen. Not connected yet." Names are plainly fake ("Sample Recruiter, Example Corp"). Buttons show but only answer "Not connected yet".

- **Mail:** three sample messages, most urgent first, each with one line on why. Action: **Draft a reply**.
- **Tasks:** a short Today and Later list with tick boxes. Action: **Add a task**.
- **Reels:** a link and caption box, plus one sample plan in numbered steps. Action: **Make a plan**.

## 5. Visual language

- **Day:** cool off-white paper, blue-black ink text, ballpoint-blue rail and tab bar. Yellow highlighter: next action only. Green: you have it. Amber: check first. Red pen: missing, blocked, error.
- **Night:** deep blue-black desk, soft paper-white text, darker navy rail. Highlighters stay bright with dark text on them. Red pen becomes a softer coral.
- **Type:** system fonts only. Rounded system face for headlines and numbers (Apple devices; plain elsewhere), ordinary one for reading. Size does the ranking, not boxes.
- **Shape and spacing:** almost no cards or borders; ruled lines separate things. Highlighter fills have slightly uneven corners. Roomy lines, big tap targets.
- **Icons:** four line drawings (briefcase, envelope, tick box, play frame), always with a word. No emoji.
- **Signature motion:** the highlighter sweeps across the next step once, about a quarter second, when the step changes. Off under reduced motion.

## 6. Directions I rejected

**A. Departures board.** Jobs as rows on an airport board; statuses flip as they change.
Striking at night, readable at a glance.
Rejected: weak in daylight, and it celebrates status over score and gaps.

**B. A conversation.** The desk talks in a message thread; you answer with buttons.
Easy on a phone and matches the planned Telegram bot.
Rejected: scores sink into scrollback; comparing jobs is slow.

## 7. Risks and questions

1. **On a skip verdict, is the main button "Move on"?** Recommended: yes. The server has no dismiss, so it is remembered only in that browser.
2. **How does the desk know a done job is handled?** Recommended: it stops nagging once you tap download (per browser). A real "applied" mark needs a server change later.
3. **Could the marker look feel childish?** Recommended: text stays straight and typed; only fills and the red underline are hand-like.
4. **Add a manual day/night switch?** Recommended: no, follow the system as today.
