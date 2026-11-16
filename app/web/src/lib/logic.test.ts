import { describe, expect, it } from "vitest";
import { fmt, gradeTone, needsAttention, nextStep, num, parseRoute, priorityJob, rowState, scoreWord, short, skipish, stageIndex, tone } from "./logic";
import { gate, job } from "../test/factories";

const none = new Set<string>();

describe("formatting", () => {
  it("num rounds to one decimal and tolerates junk", () => {
    expect([num(6.54), num("7"), num(null), num(undefined), num("abc")]).toEqual(["6.5", "7", "–", "–", "–"]);
  });
  it("fmt makes a short date and passes odd input through", () => {
    expect([fmt("2026-11-15 17:39:12"), fmt("whenever"), fmt(undefined)]).toEqual(["Nov 15, 17:39", "whenever", ""]);
  });
  it("score tone and words use the 7.5 and 5.5 thresholds", () => {
    expect([8, 7.5, 7.4, 5.5, 5.4].map(tone)).toEqual(["g", "g", "a", "a", "r"]);
    expect([scoreWord(8), scoreWord(6), scoreWord(2)]).toEqual(["Strong match", "Mixed match", "Weak match"]);
  });
  it("grade tone", () => {
    expect(["A", "B", "C", "D", "E", "F"].map(gradeTone)).toEqual(["g", "g", "a", "a", "r", "r"]);
  });
});

describe("skipish", () => {
  it("is true for a skip recommendation or a visa blocker only", () => {
    expect(skipish(job("1", "gated", { gate: { ...gate, recommend: "skip" } }))).toBe(true);
    expect(skipish(job("1", "gated", { gate: { ...gate, eligibility: "Blocker" } }))).toBe(true);
    expect(skipish(job("1", "gated", { gate: { ...gate, eligibility: "Caution" } }))).toBe(false);
    expect(skipish(job("1", "queued"))).toBe(false);
  });
});

describe("priorityJob", () => {
  const jobs = [job("a", "done"), job("b", "generating"), job("c", "gated"), job("d", "error")];
  it("orders: error, gated, unseen done, busy, newest", () => {
    expect(priorityJob(jobs, none, none)?.id).toBe("d");
    expect(priorityJob(jobs.slice(0, 3), none, none)?.id).toBe("c");
    expect(priorityJob([job("a", "done"), job("b", "generating")], none, none)?.id).toBe("a");
    expect(priorityJob([job("a", "done"), job("b", "generating")], none, new Set(["a"]))?.id).toBe("b");
    expect(priorityJob([job("a", "done")], none, new Set(["a"]))?.id).toBe("a");
    expect(priorityJob([], none, none)).toBeNull();
  });
  it("ignores dismissed jobs everywhere", () => {
    const two = [job("a", "error"), job("b", "gated")];
    expect(priorityJob(two, new Set(["a"]), none)?.id).toBe("b");
    expect(nextStep(two, new Set(["a", "b"]), none).kind).toBe("paste");
    expect(needsAttention(two, new Set(["a"]), none)).toBe(1);
  });
});

describe("nextStep", () => {
  it("picks the right sentence", () => {
    expect(nextStep([], none, none).kind).toBe("paste");
    expect(nextStep([job("a", "generating")], none, none).kind).toBe("busy");
    expect(nextStep([job("a", "done")], none, none).kind).toBe("download");
    expect(nextStep([job("a", "done")], none, new Set(["a"])).kind).toBe("paste");
    expect(nextStep([job("a", "error"), job("b", "gated")], none, none).kind).toBe("error");
    const g = nextStep([job("a", "gated", { gate: { ...gate, recommend: "skip" } })], none, none);
    expect(g).toMatchObject({ kind: "gated", risky: true, jobId: "a" });
  });
  it("its key changes when the situation changes (it drives the highlighter sweep)", () => {
    const k = (s: string) => nextStep([job("a", s as never)], none, none).key;
    expect(k("generating")).not.toBe(k("done"));
    expect(k("generating")).toBe(k("generating"));
  });
  it("needsAttention counts gated, error and unseen done jobs", () => {
    const jobs = [job("a", "gated"), job("b", "error"), job("c", "done"), job("d", "done"), job("e", "generating")];
    expect(needsAttention(jobs, none, new Set(["d"]))).toBe(3);
  });
});

describe("rowState and stageIndex", () => {
  it("rowState words", () => {
    expect(rowState(job("a", "gating"), none).text).toBe("Checking fit…");
    expect(rowState(job("a", "done"), none)).toEqual({ text: "Ready to download", style: "go" });
    expect(rowState(job("a", "done"), new Set(["a"])).text).toBe("Downloaded");
    expect(rowState(job("a", "gated", { gate: { ...gate, recommend: "skip" } }), none)).toEqual({ text: "Probably skip", style: "pen" });
    expect(rowState(job("a", "error"), none).style).toBe("pen");
  });
  it("stageIndex", () => {
    expect((["queued", "gating", "gated", "generating", "done"] as const).map(s => stageIndex(job("a", s)))).toEqual([0, 0, 1, 1, 2]);
    expect(stageIndex(job("a", "error"))).toBe(0);
    expect(stageIndex(job("a", "error", { gate }))).toBe(1);
  });
});

describe("parseRoute", () => {
  it("reads views and job ids, and falls back to jobs", () => {
    expect(parseRoute("")).toEqual({ view: "jobs", id: null });
    expect(parseRoute("#mail")).toEqual({ view: "mail", id: null });
    expect(parseRoute("#job/abc")).toEqual({ view: "jobs", id: "abc" });
    expect(parseRoute("#job/")).toEqual({ view: "jobs", id: null });
    expect(parseRoute("#nonsense")).toEqual({ view: "jobs", id: null });
  });
});

describe("short", () => {
  it("keeps the label before the explanation", () => {
    expect(short("Python and FastAPI: only in the Affinity project")).toBe("Python and FastAPI");
    expect(short("BS/MS in Computer Science (MS CS, ASU, 4.00 GPA)")).toBe("BS/MS in Computer Science");
    expect(short("Plain label")).toBe("Plain label");
    expect(short(null)).toBe("");
  });
  it("keeps two-letter labels like Go", () => {
    expect(short("Go: used in the report service")).toBe("Go");
    expect(short("AI")).toBe("AI");
  });
  it("cuts long text at a word boundary and never leaves a stub", () => {
    const out = short("Programming experience in Go, which is on the company's language list", 44);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(44);
    expect(out).not.toMatch(/\s…$/);
  });
});
