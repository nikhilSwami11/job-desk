import type { Gate, Job, Status } from "../types";

export const gate: Gate = {
  eligibility: "Fine", eligibility_reason: "JD is silent", fit: "B", met: ["Go"], partly: [], missing: ["Ruby"],
  role_type: "backend", recommend: "go",
};

export const job = (id: string, status: Status, extra: Partial<Job> = {}): Job => ({
  id, status, created: "2026-11-15 17:39:12", updated: "", cost: 0, company: "Co" + id, company_hint: "", role_hint: "",
  source: "", jd_preview: "We build payment APIs", gate: null, result: null, error: null, ...extra,
});

export const doneJob = (extra: Partial<Job> = {}): Job => job("20261115-173912-6273", "done", {
  company: "Stripe", role: "SDE", gate, mode: "normal", tokens: 23000, cost: 0.137,
  result: {
    folder: "stripe", pages: 1, issues: 0, review: "## Notes\n- **ok**",
    files: ["Nikhil_Swami_Resume.pdf", "Nikhil_Swami_Cover_Letter.pdf", "resume.json"],
    score: { overall: 6.5, skills: 6, experience: 7, level: 5.5, one_line: "Strong on backend." },
    keywords: {
      matched: ["Go"], missing: ["Ruby"],
      details: [{ term: "Go", why: "They use it.", yours: "Onsite Teams", in_resume: true },
                { term: "Ruby", why: "Core language.", yours: "Not in your bank", in_resume: false }],
    },
  },
  ...extra,
});
