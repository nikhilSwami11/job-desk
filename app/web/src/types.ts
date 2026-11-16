export type Status = "queued" | "gating" | "gated" | "generating" | "done" | "error";
export type Mode = "truthful" | "normal" | "aggressive";
export type View = "jobs" | "mail" | "tasks" | "reels";

export interface Gate {
  company?: string;
  role?: string;
  eligibility: string; // "Fine" | "Caution" | "Blocker"
  eligibility_reason: string;
  fit: string; // "A".."F" or "-"
  met: string[];
  partly: string[];
  missing: string[];
  role_type: string;
  recommend: "go" | "skip";
  summary?: string;
}

export interface Score { overall: number; skills: number; experience: number; level: number; one_line: string }
export interface KeywordDetail { term: string; why?: string; yours?: string; in_resume: boolean }
export interface Keywords { matched: string[]; missing: string[]; details?: KeywordDetail[] }

export interface Result {
  folder: string;
  files: string[];
  pages: number;
  review: string;
  issues: number;
  score: Score | null;
  keywords?: Keywords;
}

export interface Job {
  id: string;
  created: string;
  updated: string;
  status: Status;
  cost: number;
  tokens?: number;
  company?: string;
  role?: string;
  company_hint: string;
  role_hint: string;
  source: string;
  jd_preview: string;
  gate: Gate | null;
  result: Result | null;
  error: string | null;
  mode?: Mode;
}

export interface Route { view: View; id: string | null }

export type NextStep =
  | { key: string; kind: "paste" }
  | { key: string; kind: "error" | "gated" | "download" | "busy"; jobId: string; name: string; risky?: boolean };

export interface NewJobFields { jd: string; company: string; role: string; url: string }
