"""tracker.csv: one row per drafted application. Re-running a job replaces its own row."""
import csv
import time


def record(path, job, folder, today=None):
    g = job["gate"]
    rows = list(csv.reader(path.read_text().splitlines())) if path.exists() else []
    rows = [r for r in rows if len(r) < 7 or r[6] != folder]
    rows.append([today or time.strftime("%Y-%m-%d"), job["company"], job["role"],
                 f'{g.get("eligibility")} ({g.get("eligibility_reason", "")[:60]})', g.get("fit"), "drafted", folder,
                 job.get("source") or "pasted JD"])
    with open(path, "w", newline="") as f:
        csv.writer(f).writerows(rows)
