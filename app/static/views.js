/* Pure view builders: data in, HTML string out. Every piece of server text goes through esc(). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./logic.js"));
  else root.JobViews = factory(root.JobLogic);
})(typeof self !== "undefined" ? self : this, function (L) {
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/^#+\s*(.*)$/gm, "<b>$1</b>");
  const MODES = {
    truthful: ["Truthful", "Your own bank text, word for word. It only picks and orders."],
    normal: ["Normal", "Light rewording to fit the job. Recommended."],
    aggressive: ["Aggressive", "Rewrites to mirror the job's wording. Every stretch is flagged."]
  };
  const FILES = { "Nikhil_Swami_Resume.pdf": "Download resume (PDF)", "Nikhil_Swami_Cover_Letter.pdf": "Cover letter (PDF)",
                  "Nikhil_Swami_Resume.docx": "Resume (Word)", "cover_letter.txt": "Cover letter (text)" };
  /* The part of a long reason before its explanation: "Python and FastAPI: only in one project" -> "Python and FastAPI". */
  const short = (x, max = 44) => {
    const full = String(x ?? "").trim();
    let t = full.split(/:\s| \(|\s[—–-]\s/)[0].trim();
    if (t.length < 2) t = full;
    if (t.length <= max) return t;
    const cut = t.slice(0, max - 1), sp = cut.lastIndexOf(" ");
    return (sp > 12 ? cut.slice(0, sp) : cut).trimEnd() + "…";
  };
  const tick = `<svg class="i" aria-hidden="true"><use href="#i-tick"/></svg>`;

  function nextHtml(s) {
    const n = esc(s.name);
    switch (s.kind) {
      case "error": return `${n} hit a problem. <button class="hl y" data-go="${esc(s.jobId)}">See what went wrong</button>`;
      case "gated": return `${n}'s fit check is ready. <button class="hl y" data-go="${esc(s.jobId)}">${s.risky ? "See why it is risky" : "Pick how to tailor it"}</button>`;
      case "download": return `${n} is ready to <button class="hl y" data-go="${esc(s.jobId)}">download</button>.`;
      case "busy": return `Working on ${n}. You can leave and come back.`;
      default: return `Nothing waiting. <button class="hl y" data-paste>Paste a job.</button>`;
    }
  }

  function scoreCell(j) {
    if (j.status === "done" && j.result && j.result.score) {
      const v = L.num(j.result.score.overall);
      return `<span class="sc" aria-label="Score ${esc(v)} out of 10">${esc(v)}<small>/10</small></span>`;
    }
    if (j.gate && j.gate.fit && j.gate.fit !== "-") return `<span class="sc" aria-label="Fit grade ${esc(j.gate.fit)}">${esc(j.gate.fit)}</span>`;
    return `<span class="sc mute" aria-hidden="true">–</span>`;
  }
  function stateHtml(j, handled) {
    const s = L.rowState(j, handled);
    const cls = { mute: "mute", pen: "pen", go: "hl y" }[s.style];
    return `<span class="${cls}">${esc(s.text)}</span>`;
  }
  function rowsHtml(jobs, ctx) {
    return jobs.map(j => `<li><button class="row-btn" data-go="${esc(j.id)}" ${ctx.selectedId === j.id ? 'aria-current="true"' : ""}>
      <span><span class="name">${esc(L.name(j))}</span><span class="role">${esc(j.role || j.role_hint || "")}</span><span class="state">${stateHtml(j, ctx.handled)}</span></span>${scoreCell(j)}</button></li>`).join("");
  }
  const movedHtml = (count, showing) => count
    ? `<button class="linkbtn" data-toggle-moved>${showing ? "Hide" : "Show"} ${count} moved-on job${count > 1 ? "s" : ""}</button>` : "";

  function rulerSvg(v, small) {
    const x = Math.max(0, Math.min(10, Number(v) || 0)) * 30, y = small ? 15 : 17;
    const ticks = Array.from({ length: 11 }, (_, i) => `<line class="tick" x1="${i * 30}" y1="${y}" x2="${i * 30}" y2="${y + (small ? 6 : 8)}"/>`).join("");
    const labels = small ? "" : `<text x="0" y="35" text-anchor="start">0</text><text x="150" y="35" text-anchor="middle">5</text><text x="300" y="35" text-anchor="end">10</text>`;
    return `<svg class="ruler" viewBox="0 0 300 ${small ? 24 : 38}" role="img" aria-label="${esc(L.num(v))} on a scale of 0 to 10">
      <line class="base" x1="0" y1="${y}" x2="300" y2="${y}"/>${ticks}
      <path class="mk ${L.tone(v)}" d="M5 ${small ? 8 : 9} L${Math.max(6, x)} ${small ? 7 : 8}" stroke-width="${small ? 9 : 13}"/>${labels}</svg>`;
  }

  function trackHtml(j, downloaded) {
    const idx = L.stageIndex(j);
    return `<ol class="track" aria-label="Progress">${["Check", "Build", "Download"].map((n, i) => {
      const done = i < idx || (i === 2 && downloaded);
      return `<li class="${done ? "done" : i === idx ? "now" : ""}">${done ? tick : ""}${n}</li>`;
    }).join("")}</ol>`;
  }

  function verdictHtml(j) {
    const g = j.gate;
    if (!g) return "";
    const skip = L.skipish(j);
    const visa = { Fine: ["OK to apply", "g"], Caution: ["Check first", "a"], Blocker: ["Likely blocked", "r"] }[g.eligibility] || [g.eligibility, ""];
    const fit = (g.fit || "-").trim().toUpperCase()[0];
    const ft = L.gradeTone(fit);
    const hl = (a, c) => (a || []).map(x => `<span class="hl ${c}">${esc(short(x))}</span>`).join(" ");
    const full = [["You have", g.met], ["Partly", g.partly], ["Missing", g.missing]].filter(([, a]) => a && a.length);
    return `<h2 class="verdict">${skip ? `<span class="pen">Skip this one</span>` : `<span class="hl g">Worth applying</span>`}</h2>
      <p class="ask"><b>Can you apply?</b>${visa[1] ? `<span class="hl ${visa[1]}">${esc(visa[0])}</span>` : `<b class="inl">${esc(visa[0])}</b>`} ${esc(g.eligibility_reason)}</p>
      <div><b>Fit grade</b> <span class="mute">A is best, F is worst</span>
        <ol class="grade" role="img" aria-label="Fit grade ${esc(fit)}">${"ABCDEF".split("").map(L2 => `<li class="${L2 === fit ? "on " + ft : ""}">${L2}</li>`).join("")}</ol>
        <span class="mute">Role focus: ${esc(short(g.role_type, 70))}</span></div>
      <div class="sets">
        ${g.met && g.met.length ? `<p><b>You have</b> ${hl(g.met, "g")}</p>` : ""}
        ${g.partly && g.partly.length ? `<p><b>Partly</b> ${hl(g.partly, "a")}</p>` : ""}
        ${g.missing && g.missing.length ? `<p><b>Missing</b> ${g.missing.map(x => `<span class="pen">${esc(short(x))}</span>`).join(" &nbsp;")}</p>` : ""}
      </div>
      ${full.length ? `<details class="more"><summary>The reasons behind this</summary><div class="reasons">${full.map(([t, a]) =>
        `<p><b>${t}</b></p><ul>${a.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`).join("")}${g.role_type ? `<p><b>Role focus</b></p><ul><li>${esc(g.role_type)}</li></ul>` : ""}</div></details>` : ""}`;
  }

  const modePickerHtml = mode => `<fieldset class="modes"><legend>How hard should it tailor?</legend>${Object.entries(MODES).map(([k, [t, d]]) =>
    `<label class="mode"><input type="radio" name="mode" value="${k}" data-fid="mode-${k}" ${mode === k ? "checked" : ""}><span><b>${t}</b><span class="d">${d}</span></span></label>`).join("")}</fieldset>`;

  function resultHtml(j, ctx) {
    const r = j.result, sc = r.score, kw = r.keywords || { matched: [], missing: [], details: [] };
    const n = sc ? Number(sc.overall) : null;
    const total = kw.matched.length + kw.missing.length;
    const det = kw.details && kw.details.length ? kw.details
      : [...kw.matched.map(t => ({ term: t, in_resume: true })), ...kw.missing.map(t => ({ term: t, in_resume: false }))];
    const sd = det.find(d => d.term === ctx.selKw);
    const sub = (label, v) => `<li><span>${label}</span>${rulerSvg(Number(v), true)}<b>${esc(L.num(v))}</b></li>`;
    const others = r.files.filter(f => FILES[f] && f !== "Nikhil_Swami_Resume.pdf");
    const warn = [];
    if (r.issues) warn.push(`${r.issues} thing${r.issues > 1 ? "s" : ""} to double-check. Open "What changed" below.`);
    if (r.pages !== 1) warn.push(`The resume is ${r.pages} pages. The target is 1.`);
    return `${sc ? `<section class="score" aria-label="Match score">
        <p class="big" aria-label="Match score ${esc(L.num(n))} out of 10"><span class="num">${esc(L.num(n))}</span><span class="of">/10</span><span class="word hl ${L.tone(n)}">${L.scoreWord(n)}</span></p>
        ${rulerSvg(n, false)}
        <p class="why">${esc(sc.one_line)}</p>
        <ul class="subs">${sub("Skills", sc.skills)}${sub("Experience", sc.experience)}${sub("Level", sc.level)}</ul></section>` : ""}
      ${warn.length ? `<div class="penbox">${warn.map(w => `<p>${esc(w)}</p>`).join("")}</div>` : ""}
      ${total ? `<h3 class="sec">Keywords: ${kw.matched.length} of ${total} are in your resume</h3>
        <p class="mute tight">Tap a word to see why the job wants it.</p>
        <p class="kws">${det.map((d, i) => `<button class="kw ${d.in_resume ? "have" : "miss"}" data-kw="${esc(d.term)}" data-fid="kw-${i}" aria-pressed="${ctx.selKw === d.term}">${esc(d.term)}<span class="vh">${d.in_resume ? " (in your resume)" : " (missing)"}</span></button>`).join(" ")}</p>
        ${sd ? `<div class="kwnote"><b>${esc(sd.term)}</b> ${sd.in_resume ? "is in your resume." : "is not in your resume."}${sd.why ? `<br>${esc(sd.why)}` : ""}${sd.yours ? `<br><span class="mute">${esc(sd.yours)}</span>` : ""}</div>` : ""}` : ""}
      ${others.length ? `<h3 class="sec">Other files</h3><div class="files">${others.map(f => `<a class="btn" data-dl target="_blank" rel="noopener" href="/files/${esc(j.id)}/${encodeURIComponent(f)}?t=${encodeURIComponent(ctx.token)}">${FILES[f]}</a>`).join("")}</div>` : ""}
      <details class="more"><summary>What changed and what to double-check</summary><div class="review">${md(r.review)}</div></details>
      <p class="foot">Mode: ${esc(j.mode || "normal")}. Saved in your tracker as "drafted". You send it yourself.${j.tokens ? ` ${Math.round(j.tokens / 1000)}k tokens, about $${Number(j.cost).toFixed(2)}.` : ""}</p>`;
  }

  function actionBarHtml(j, ctx) {
    const id = esc(j.id);
    if (j.status === "gated") {
      return L.skipish(j)
        ? `<div class="actionbar"><button class="btn go" data-moveon="${id}">Move on</button><button class="linkbtn" data-build="${id}">Build anyway</button></div>`
        : `<div class="actionbar"><button class="btn go" data-build="${id}">Build resume and cover letter</button><span class="note">About a minute. Nothing is sent anywhere.</span></div>`;
    }
    if (j.status === "done" && j.result && j.result.files.includes("Nikhil_Swami_Resume.pdf"))
      return `<div class="actionbar"><a class="btn go" data-dl target="_blank" rel="noopener" href="/files/${id}/Nikhil_Swami_Resume.pdf?t=${encodeURIComponent(ctx.token)}">Download resume (PDF)</a></div>`;
    if (j.status === "error") return `<div class="actionbar"><button class="btn go" data-retry="${id}">Try again</button></div>`;
    return "";
  }

  function detailHtml(j, ctx) {
    let b = `<h2 class="who">${esc(L.name(j))}</h2><p class="meta">${esc([j.role || j.role_hint, L.fmt(j.created)].filter(Boolean).join(" · "))}</p>${trackHtml(j, ctx.downloaded)}`;
    if (L.BUSY.includes(j.status)) {
      b += `<div class="wait"><p class="mark"><span class="hl y">${j.status === "generating" ? "Building your resume and cover letter…" : "Checking visa and fit…"}</span></p>
        <p>You can leave. You will be notified when it is ready.</p><p class="mute">${esc(j.jd_preview)}…</p></div>`;
    }
    if (j.status === "error") b += `<div class="penbox"><p>${esc(j.error || "Something went wrong.")}</p></div>`;
    if (j.status === "done" && j.result) {
      b += resultHtml(j, ctx);
      if (j.gate) b += `<details class="more"><summary>Fit check: ${L.skipish(j) ? "Skip" : "Worth applying"}, grade ${esc(j.gate.fit)}</summary>${verdictHtml(j)}</details>`;
      return b + actionBarHtml(j, ctx);
    }
    b += verdictHtml(j);
    if (j.status === "gated" && !L.skipish(j)) b += modePickerHtml(ctx.mode);
    return b + actionBarHtml(j, ctx);
  }
  const emptyDetailHtml = () => `<p class="empty">Paste a job on the left. Your fit check and resume show up here.</p>`;

  return { esc, md, short, MODES, FILES, nextHtml, rowsHtml, movedHtml, rulerSvg, trackHtml, verdictHtml, modePickerHtml, resultHtml, actionBarHtml, detailHtml, emptyDetailHtml };
});
