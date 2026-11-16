const test = require("node:test");
const assert = require("node:assert");
const L = require("../static/logic.js");

const job = (id, status, extra = {}) => ({ id, status, company: "Co" + id, created: "2026-11-15 17:39:12", ...extra });
const none = new Set();

test("num rounds to one decimal and tolerates junk", () => {
  assert.equal(L.num(6.54), "6.5");
  assert.equal(L.num("7"), "7");
  assert.equal(L.num(null), "–");
  assert.equal(L.num(undefined), "–");
  assert.equal(L.num("abc"), "–");
});

test("fmt makes a short date and passes odd input through", () => {
  assert.equal(L.fmt("2026-11-15 17:39:12"), "Nov 15, 17:39");
  assert.equal(L.fmt("whenever"), "whenever");
  assert.equal(L.fmt(undefined), "");
});

test("score tone and words use the 7.5 and 5.5 thresholds", () => {
  assert.deepEqual([8, 7.5, 7.4, 5.5, 5.4].map(L.tone), ["g", "g", "a", "a", "r"]);
  assert.equal(L.scoreWord(8), "Strong match");
  assert.equal(L.scoreWord(6), "Mixed match");
  assert.equal(L.scoreWord(2), "Weak match");
});

test("grade tone", () => {
  assert.deepEqual(["A", "B", "C", "D", "E", "F"].map(L.gradeTone), ["g", "g", "a", "a", "r", "r"]);
});

test("skipish is true for a skip recommendation or a visa blocker", () => {
  assert.equal(L.skipish(job("1", "gated", { gate: { recommend: "skip", eligibility: "Fine" } })), true);
  assert.equal(L.skipish(job("1", "gated", { gate: { recommend: "go", eligibility: "Blocker" } })), true);
  assert.equal(L.skipish(job("1", "gated", { gate: { recommend: "go", eligibility: "Caution" } })), false);
  assert.equal(L.skipish(job("1", "queued")), false);
});

test("priority: error beats gated beats unseen done beats busy beats newest", () => {
  const jobs = [job("a", "done"), job("b", "generating"), job("c", "gated"), job("d", "error")];
  assert.equal(L.priorityJob(jobs, none, none).id, "d");
  assert.equal(L.priorityJob(jobs.slice(0, 3), none, none).id, "c");
  assert.equal(L.priorityJob([job("a", "done"), job("b", "generating")], none, none).id, "a");
  assert.equal(L.priorityJob([job("a", "done"), job("b", "generating")], none, new Set(["a"])).id, "b");
  assert.equal(L.priorityJob([job("a", "done")], none, new Set(["a"])).id, "a");
  assert.equal(L.priorityJob([], none, none), null);
});

test("dismissed jobs are ignored everywhere", () => {
  const jobs = [job("a", "error"), job("b", "gated")];
  assert.equal(L.priorityJob(jobs, new Set(["a"]), none).id, "b");
  assert.equal(L.nextStep(jobs, new Set(["a", "b"]), none).kind, "paste");
  assert.equal(L.needsAttention(jobs, new Set(["a"]), none), 1);
});

test("nextStep picks the right sentence", () => {
  assert.equal(L.nextStep([], none, none).kind, "paste");
  assert.equal(L.nextStep([job("a", "generating")], none, none).kind, "busy");
  assert.equal(L.nextStep([job("a", "done")], none, none).kind, "download");
  assert.equal(L.nextStep([job("a", "done")], none, new Set(["a"])).kind, "paste");
  const g = L.nextStep([job("a", "gated", { gate: { recommend: "skip" } })], none, none);
  assert.deepEqual([g.kind, g.risky, g.jobId], ["gated", true, "a"]);
  assert.equal(L.nextStep([job("a", "error"), job("b", "gated")], none, none).kind, "error");
});

test("nextStep key changes when the situation changes (it drives the highlighter sweep)", () => {
  const k1 = L.nextStep([job("a", "generating")], none, none).key;
  const k2 = L.nextStep([job("a", "done")], none, none).key;
  assert.notEqual(k1, k2);
  assert.equal(k1, L.nextStep([job("a", "generating")], none, none).key);
});

test("needsAttention counts gated, error and unseen done jobs", () => {
  const jobs = [job("a", "gated"), job("b", "error"), job("c", "done"), job("d", "done"), job("e", "generating")];
  assert.equal(L.needsAttention(jobs, none, new Set(["d"])), 3);
});

test("rowState words", () => {
  assert.equal(L.rowState(job("a", "gating"), none).text, "Checking fit…");
  assert.deepEqual(L.rowState(job("a", "done"), none), { text: "Ready to download", style: "go" });
  assert.equal(L.rowState(job("a", "done"), new Set(["a"])).text, "Downloaded");
  assert.deepEqual(L.rowState(job("a", "gated", { gate: { recommend: "skip" } }), none), { text: "Probably skip", style: "pen" });
  assert.equal(L.rowState(job("a", "error"), none).style, "pen");
});

test("stageIndex", () => {
  assert.deepEqual(["queued", "gating", "gated", "generating", "done"].map(s => L.stageIndex(job("a", s))), [0, 0, 1, 1, 2]);
  assert.equal(L.stageIndex(job("a", "error")), 0);
  assert.equal(L.stageIndex(job("a", "error", { gate: {} })), 1);
});

test("parseRoute", () => {
  assert.deepEqual(L.parseRoute(""), { view: "jobs", id: null });
  assert.deepEqual(L.parseRoute("#mail"), { view: "mail", id: null });
  assert.deepEqual(L.parseRoute("#job/abc"), { view: "jobs", id: "abc" });
  assert.deepEqual(L.parseRoute("#job/"), { view: "jobs", id: null });
  assert.deepEqual(L.parseRoute("#nonsense"), { view: "jobs", id: null });
});
