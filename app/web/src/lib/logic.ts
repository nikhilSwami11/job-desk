/** Pure rules for the dashboard: no React, no DOM, no network. */
import type { Job, NextStep, Route, View } from "../types";

export const BUSY = ["queued", "gating", "generating"] as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const isBusy = (j: Job) => (BUSY as readonly string[]).includes(j.status);

export function num(v: unknown): string {
  const n = Number(v);
  return v === null || v === undefined || !Number.isFinite(n) ? "–" : String(Math.round(n * 10) / 10);
}

export function fmt(created: string | undefined): string {
  const m = /^(\d{4})-(\d\d)-(\d\d) (\d\d:\d\d)/.exec(created ?? "");
  return m ? `${MONTHS[+m[2] - 1]} ${+m[3]}, ${m[4]}` : (created ?? "");
}

export type Tone = "g" | "a" | "r";
export const tone = (n: number): Tone => (n >= 7.5 ? "g" : n >= 5.5 ? "a" : "r");
export const scoreWord = (n: number) => (n >= 7.5 ? "Strong match" : n >= 5.5 ? "Mixed match" : "Weak match");
export const gradeTone = (fit: string): Tone => ("AB".includes(fit) ? "g" : "CD".includes(fit) ? "a" : "r");

export const skipish = (j: Job) => !!(j.gate && (j.gate.recommend === "skip" || j.gate.eligibility === "Blocker"));
export const jobName = (j: Job) => j.company || j.company_hint || "New job";
export const live = (jobs: Job[], dismissed: ReadonlySet<string>) => jobs.filter(j => !dismissed.has(j.id));

/** The job to look at first: problem, then needs a go-ahead, then ready to download, then busy, then newest. */
export function priorityJob(jobs: Job[], dismissed: ReadonlySet<string>, handled: ReadonlySet<string>): Job | null {
  const l = live(jobs, dismissed);
  return l.find(j => j.status === "error") || l.find(j => j.status === "gated") ||
    l.find(j => j.status === "done" && !handled.has(j.id)) || l.find(isBusy) || l[0] || null;
}

/** The one sentence at the top: what to do next. */
export function nextStep(jobs: Job[], dismissed: ReadonlySet<string>, handled: ReadonlySet<string>): NextStep {
  const l = live(jobs, dismissed);
  const err = l.find(j => j.status === "error");
  if (err) return { key: "e" + err.id, kind: "error", jobId: err.id, name: jobName(err) };
  const g = l.find(j => j.status === "gated");
  if (g) return { key: "g" + g.id, kind: "gated", jobId: g.id, name: jobName(g), risky: skipish(g) };
  const d = l.find(j => j.status === "done" && !handled.has(j.id));
  if (d) return { key: "d" + d.id, kind: "download", jobId: d.id, name: jobName(d) };
  const b = l.find(isBusy);
  if (b) return { key: "b" + b.id + b.status, kind: "busy", jobId: b.id, name: jobName(b) };
  return { key: "p", kind: "paste" };
}

export const needsAttention = (jobs: Job[], dismissed: ReadonlySet<string>, handled: ReadonlySet<string>) =>
  live(jobs, dismissed).filter(j => j.status === "gated" || j.status === "error" || (j.status === "done" && !handled.has(j.id))).length;

export type RowStyle = "mute" | "pen" | "go";
export function rowState(j: Job, handled: ReadonlySet<string>): { text: string; style: RowStyle } {
  switch (j.status) {
    case "queued": return { text: "Waiting", style: "mute" };
    case "gating": return { text: "Checking fit…", style: "mute" };
    case "generating": return { text: "Building…", style: "mute" };
    case "error": return { text: "Problem", style: "pen" };
    case "gated": return skipish(j) ? { text: "Probably skip", style: "pen" } : { text: "Your go-ahead", style: "go" };
    case "done": return handled.has(j.id) ? { text: "Downloaded", style: "mute" } : { text: "Ready to download", style: "go" };
  }
}

/** 0 = Check, 1 = Build, 2 = Download */
export function stageIndex(j: Job): number {
  return { queued: 0, gating: 0, gated: 1, generating: 1, done: 2, error: j.gate ? 1 : 0 }[j.status] ?? 0;
}

export function parseRoute(hash: string): Route {
  const [a, b] = hash.replace(/^#/, "").split("/");
  if (a === "job" && b) return { view: "jobs", id: b };
  const view: View = a === "mail" || a === "tasks" || a === "reels" ? a : "jobs";
  return { view, id: null };
}

/** The label before a long explanation: "Python and FastAPI: only in one project" -> "Python and FastAPI". */
export function short(x: unknown, max = 44): string {
  const full = String(x ?? "").trim();
  let t = full.split(/:\s| \(|\s[—–-]\s/)[0].trim();
  if (t.length < 2) t = full;
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  return (sp > 12 ? cut.slice(0, sp) : cut).trimEnd() + "…";
}
