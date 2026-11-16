const test = require("node:test");
const assert = require("node:assert");
const V = require("../static/views.js");

const EVIL = `<img src=x onerror="alert(1)">`;
const gate = { eligibility: "Fine", eligibility_reason: "JD is silent", fit: "B", met: ["Go"], partly: [], missing: ["Ruby"], role_type: "backend", recommend: "go" };
const done = (over = {}) => ({
  id: "20261115-173912-6273", status: "done", company: "Stripe", role: "SDE", created: "2026-11-15 17:39:12", gate, mode: "normal", tokens: 23000, cost: 0.137,
  result: { folder: "stripe", pages: 1, issues: 0, review: "## Notes\n- **ok**", files: ["Nikhil_Swami_Resume.pdf", "Nikhil_Swami_Cover_Letter.pdf", "resume.json"],
    score: { overall: 6.5, skills: 6, experience: 7, level: 5.5, one_line: "Strong on backend." },
    keywords: { matched: ["Go"], missing: ["Ruby"], details: [{ term: "Go", why: "They use it.", yours: "Onsite Teams", in_resume: true }, { term: "Ruby", why: "Core language.", yours: "Not in your bank", in_resume: false }] } },
  ...over,
});
const ctx = (o = {}) => ({ mode: "normal", selKw: null, downloaded: false, token: "tok en", ...o });

test("esc escapes the five dangerous characters", () => {
  assert.equal(V.esc(`<a href="x">'&'</a>`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  assert.equal(V.esc(null), "");
});

test("md bolds and escapes", () => {
  assert.equal(V.md("**hi** <b>"), "<b>hi</b> &lt;b&gt;");
  assert.equal(V.md("## Title"), "<b>Title</b>");
});

test("server text can never inject markup (rows, detail, next step)", () => {
  const j = done({ company: EVIL, role: EVIL, gate: { ...gate, eligibility_reason: EVIL, met: [EVIL], missing: [EVIL], role_type: EVIL },
    result: { ...done().result, review: EVIL, score: { overall: 6, skills: 6, experience: 6, level: 6, one_line: EVIL },
      keywords: { matched: [EVIL], missing: [], details: [{ term: EVIL, why: EVIL, yours: EVIL, in_resume: true }] } } });
  const html = V.detailHtml(j, ctx({ selKw: EVIL })) + V.rowsHtml([j], { selectedId: null, handled: new Set() }) + V.nextHtml({ kind: "download", name: EVIL, jobId: EVIL });
  assert.ok(!html.includes("<img"), "raw <img> leaked");
  assert.ok(html.includes("&lt;img"));
});

test("the verdict is words, not just colour", () => {
  assert.match(V.verdictHtml(done()), /Worth applying/);
  assert.match(V.verdictHtml(done({ gate: { ...gate, recommend: "skip" } })), /Skip this one/);
  assert.match(V.verdictHtml(done({ gate: { ...gate, eligibility: "Blocker" } })), /Likely blocked/);
  assert.match(V.verdictHtml(done({ gate: { ...gate, eligibility: "Caution" } })), /Check first/);
});

test("fit grade marks exactly one letter", () => {
  const html = V.verdictHtml(done());
  assert.equal((html.match(/class="on /g) || []).length, 1);
  assert.match(html, /aria-label="Fit grade B"/);
});

test("done job shows the score, keywords, download button with an encoded token, and hides internal files", () => {
  const html = V.detailHtml(done(), ctx());
  assert.match(html, />6\.5</);
  assert.match(html, /Mixed match/);
  assert.match(html, /Keywords: 1 of 2/);
  assert.match(html, /Download resume \(PDF\)/);
  assert.match(html, /t=tok%20en/);
  assert.ok(!html.includes("resume.json"));
  assert.match(html, /Cover letter \(PDF\)/);
});

test("the selected keyword shows why and where you have it", () => {
  const html = V.detailHtml(done(), ctx({ selKw: "Ruby" }));
  assert.match(html, /is not in your resume/);
  assert.match(html, /Core language\./);
  assert.match(html, /Not in your bank/);
  assert.match(html, /aria-pressed="true"/);
});

test("warnings appear for issues and for page count", () => {
  const html = V.detailHtml(done({ result: { ...done().result, issues: 2, pages: 2 } }), ctx());
  assert.match(html, /2 things to double-check/);
  assert.match(html, /The resume is 2 pages/);
  assert.ok(!V.detailHtml(done(), ctx()).includes("penbox"));
});

test("gated job: mode picker with the chosen mode checked and a Build button", () => {
  const j = { id: "x", status: "gated", company: "Acme", gate, created: "2026-11-15 10:00:00" };
  const html = V.detailHtml(j, ctx({ mode: "aggressive" }));
  assert.match(html, /value="aggressive"[^>]*checked/);
  assert.ok(!/value="normal"[^>]*checked/.test(html));
  assert.match(html, /data-build="x"/);
});

test("a risky gated job offers Move on first and Build anyway second", () => {
  const j = { id: "x", status: "gated", company: "Acme", gate: { ...gate, recommend: "skip" }, created: "" };
  const html = V.actionBarHtml(j, ctx());
  assert.ok(html.indexOf("data-moveon") < html.indexOf("data-build"));
});

test("error job shows the error and a Try again button", () => {
  const html = V.detailHtml({ id: "x", status: "error", company: "A", error: "boom", created: "" }, ctx());
  assert.match(html, /boom/);
  assert.match(html, /data-retry="x"/);
});

test("busy jobs show a waiting message and no action bar", () => {
  const html = V.detailHtml({ id: "x", status: "generating", company: "A", jd_preview: "hello", created: "", gate }, ctx());
  assert.match(html, /Building your resume/);
  assert.ok(!html.includes("actionbar"));
});

test("progress track marks stages", () => {
  const html = V.trackHtml(done(), true);
  assert.equal((html.match(/class="done"/g) || []).length, 3);
  assert.equal((V.trackHtml({ id: "x", status: "gating" }, false).match(/class="now"/g) || []).length, 1);
});

test("rows show score for done jobs, grade for gated jobs and a dash otherwise", () => {
  const rows = V.rowsHtml([done(), { id: "g", status: "gated", gate, company: "G" }, { id: "q", status: "queued", company: "Q" }], { selectedId: "g", handled: new Set() });
  assert.match(rows, /Score 6\.5 out of 10/);
  assert.match(rows, /Fit grade B/);
  assert.match(rows, /aria-hidden="true">–/);
  assert.equal((rows.match(/aria-current="true"/g) || []).length, 1);
});

test("ruler clamps out-of-range values", () => {
  assert.match(V.rulerSvg(15, false), /L300 8/);
  assert.match(V.rulerSvg(-3, false), /L6 8/);
});

test("nextHtml covers every kind", () => {
  for (const kind of ["error", "gated", "download", "busy", "paste"]) assert.ok(V.nextHtml({ kind, name: "Acme", jobId: "1" }).length > 5);
  assert.match(V.nextHtml({ kind: "paste" }), /data-paste/);
});

test("short keeps the label before the explanation", () => {
  assert.equal(V.short("Python and FastAPI: only in the Affinity project"), "Python and FastAPI");
  assert.equal(V.short("BS/MS in Computer Science (MS CS, ASU, 4.00 GPA)"), "BS/MS in Computer Science");
  assert.equal(V.short("Plain label"), "Plain label");
  assert.equal(V.short("x".repeat(80)).length, 44);
  assert.equal(V.short(null), "");
});

test("long gate reasons show as short chips, with the full text one tap away", () => {
  const long = { ...gate, met: ["Go: used in the Onsite Teams report service on AWS"], missing: ["Writing tests: nothing in your bank"] };
  const html = V.verdictHtml(done({ gate: long }));
  assert.match(html, /<span class="hl g">Go<\/span>/);
  assert.match(html, /<li>Go: used in the Onsite Teams report service on AWS<\/li>/);
  assert.match(html, /The reasons behind this/);
});

test("error text is plain, not underlined", () => {
  const html = V.detailHtml({ id: "x", status: "error", company: "A", error: "boom", created: "" }, ctx());
  assert.ok(!html.includes('class="pen">boom'));
});

test("short cuts at a word boundary and never leaves a stub", () => {
  const out = V.short("Programming experience in Go, which is on the company's language list", 44);
  assert.ok(out.endsWith("…") && out.length <= 44 && !/\s…$/.test(out), out);
  assert.equal(V.short("T: something long follows here"), "T: something long follows here".slice(0, 44));
});

test("a finished job leads with the score, and the fit check is folded below it", () => {
  const html = V.detailHtml(done(), ctx());
  assert.ok(html.indexOf("Match score") < html.indexOf("Fit check: Worth applying, grade B"));
  assert.match(html, /<details class="more"><summary>Fit check: /);
});

test("a visa answer of Fine is marked green", () => {
  assert.match(V.verdictHtml(done()), /<span class="hl g">OK to apply<\/span>/);
});

test("short keeps two-letter labels like Go", () => {
  assert.equal(V.short("Go: used in the report service"), "Go");
  assert.equal(V.short("AI"), "AI");
});

test("a skip verdict hides the tailoring picker but a go verdict shows it", () => {
  const base = { id: "x", status: "gated", company: "A", created: "" };
  assert.ok(!V.detailHtml({ ...base, gate: { ...gate, recommend: "skip" } }, ctx()).includes('name="mode"'));
  assert.ok(V.detailHtml({ ...base, gate }, ctx()).includes('name="mode"'));
});
