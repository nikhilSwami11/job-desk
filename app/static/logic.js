/* Pure rules for the dashboard: no DOM, no network. Shared by the browser and the node tests. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.JobLogic = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const BUSY = ["queued", "gating", "generating"];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const num = v => { const n = Number(v); return v === null || v === undefined || !Number.isFinite(n) ? "–" : String(Math.round(n * 10) / 10); };
  const fmt = c => { const m = /^(\d{4})-(\d\d)-(\d\d) (\d\d:\d\d)/.exec(c || ""); return m ? `${MONTHS[+m[2] - 1]} ${+m[3]}, ${m[4]}` : (c || ""); };
  const tone = n => (n >= 7.5 ? "g" : n >= 5.5 ? "a" : "r");
  const scoreWord = n => (n >= 7.5 ? "Strong match" : n >= 5.5 ? "Mixed match" : "Weak match");
  const gradeTone = fit => ("AB".includes(fit) ? "g" : "CD".includes(fit) ? "a" : "r");
  const skipish = j => !!(j.gate && (j.gate.recommend === "skip" || j.gate.eligibility === "Blocker"));
  const name = j => j.company || j.company_hint || "New job";
  const live = (jobs, dismissed) => jobs.filter(j => !dismissed.has(j.id));

  /* The job to look at first: problem, then needs a go-ahead, then ready to download, then busy, then newest. */
  function priorityJob(jobs, dismissed, handled) {
    const l = live(jobs, dismissed);
    return l.find(j => j.status === "error") || l.find(j => j.status === "gated") ||
      l.find(j => j.status === "done" && !handled.has(j.id)) || l.find(j => BUSY.includes(j.status)) || l[0] || null;
  }

  /* The one sentence at the top: what to do next. Returns data; views.js turns it into HTML. */
  function nextStep(jobs, dismissed, handled) {
    const l = live(jobs, dismissed);
    const err = l.find(j => j.status === "error");
    if (err) return { key: "e" + err.id, kind: "error", jobId: err.id, name: name(err) };
    const g = l.find(j => j.status === "gated");
    if (g) return { key: "g" + g.id, kind: "gated", jobId: g.id, name: name(g), risky: skipish(g) };
    const d = l.find(j => j.status === "done" && !handled.has(j.id));
    if (d) return { key: "d" + d.id, kind: "download", jobId: d.id, name: name(d) };
    const b = l.find(j => BUSY.includes(j.status));
    if (b) return { key: "b" + b.id + b.status, kind: "busy", jobId: b.id, name: name(b) };
    return { key: "p", kind: "paste" };
  }

  const needsAttention = (jobs, dismissed, handled) => live(jobs, dismissed)
    .filter(j => j.status === "gated" || j.status === "error" || (j.status === "done" && !handled.has(j.id))).length;

  function rowState(j, handled) {
    switch (j.status) {
      case "queued": return { text: "Waiting", style: "mute" };
      case "gating": return { text: "Checking fit…", style: "mute" };
      case "generating": return { text: "Building…", style: "mute" };
      case "error": return { text: "Problem", style: "pen" };
      case "gated": return skipish(j) ? { text: "Probably skip", style: "pen" } : { text: "Your go-ahead", style: "go" };
      case "done": return handled.has(j.id) ? { text: "Downloaded", style: "mute" } : { text: "Ready to download", style: "go" };
      default: return { text: String(j.status), style: "mute" };
    }
  }

  /* 0 = Check, 1 = Build, 2 = Download */
  function stageIndex(j) {
    return { queued: 0, gating: 0, gated: 1, generating: 1, done: 2, error: j.gate ? 1 : 0 }[j.status] ?? 0;
  }

  function parseRoute(hash) {
    const [a, b] = String(hash || "").replace(/^#/, "").split("/");
    if (a === "job" && b) return { view: "jobs", id: b };
    return { view: ["mail", "tasks", "reels"].includes(a) ? a : "jobs", id: null };
  }

  return { BUSY, num, fmt, tone, scoreWord, gradeTone, skipish, name, live, priorityJob, nextStep, needsAttention, rowState, stageIndex, parseRoute };
});
