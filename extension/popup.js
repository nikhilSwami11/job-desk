const root = document.getElementById("root");
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]));
const STATUS = { queued:["Waiting",""], gating:["Checking fit…","blue"], gated:["Your go-ahead","warn"], generating:["Building…","blue"], done:["Ready","ok"], error:["Problem","bad"] };
let jobs = [], msg = "", busy = false, token = "", draft = "", pasteOpen = false;
const expanded = new Set();

async function setup() {
  token = await getToken();
  render();
  if (token) { await load(); window.__iv = setInterval(load, 3000); }
}

async function load() {
  try { jobs = (await api("/api/jobs")).slice(0, 6); msg = ""; } catch (e) { msg = e.message; }
  render();
}

async function mode() { return (await chrome.storage.local.get("mode")).mode || "normal"; }

window.saveToken = async () => {
  const v = document.getElementById("tok").value.trim();
  if (!v) return;
  await chrome.storage.local.set({ token: v, seen: null });
  token = v; await load(); if (!window.__iv) window.__iv = setInterval(load, 3000);
};
window.sendPage = async () => {
  busy = true; msg = ""; render();
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await sendTab(tab); chrome.runtime.sendMessage("poll"); await load();
  } catch (e) { msg = e.message; }
  busy = false; render();
};
window.build = async id => {
  const sel = document.getElementById("m-" + id);
  const m = sel ? sel.value : "normal";
  await chrome.storage.local.set({ mode: m });
  try { await api(`/api/jobs/${id}/generate`, { method: "POST", body: JSON.stringify({ mode: m }) }); chrome.runtime.sendMessage("poll"); await load(); }
  catch (e) { msg = e.message; render(); }
};
window.togglePaste = () => { pasteOpen = !pasteOpen; render(); if (pasteOpen) setTimeout(() => { const t = document.getElementById("draft"); if (t) t.focus(); }, 0); };
window.sendPaste = async () => {
  if (draft.trim().length < 80) { msg = "Paste the full job description (at least a few sentences)."; render(); return; }
  busy = true; msg = ""; render();
  try {
    await api("/api/jobs", { method: "POST", body: JSON.stringify({ jd: draft.slice(0, 40000), url: "" }) });
    draft = ""; pasteOpen = false; chrome.runtime.sendMessage("poll"); await load();
  } catch (e) { msg = e.message; }
  busy = false; render();
};
window.expand = id => { expanded.has(id) ? expanded.delete(id) : expanded.add(id); render(); };
window.openDash = () => chrome.tabs.create({ url: BASE + "/" });

function mini(j) {
  const [st, cls] = STATUS[j.status] || [j.status, ""];
  const sc = j.result && j.result.score ? ` · ${j.result.score.overall}/10` : "";
  const name = [j.company || j.company_hint || "New job", j.role || j.role_hint].filter(Boolean).join(" · ");
  return `<div class="mini" data-act="expand" data-id="${j.id}" role="button" tabindex="0"><span class="mt">${esc(name)}${sc}</span><span class="chip ${cls}">${st}</span></div>`;
}

function card(j) {
  const [st, cls] = STATUS[j.status] || [j.status, ""];
  const g = j.gate, r = j.result;
  let b = "";
  if (["queued", "gating", "generating"].includes(j.status)) b = `<div class="mute">${j.status === "generating" ? "Building resume and cover letter…" : "Checking visa and fit…"}</div>`;
  if (g && j.status === "gated") {
    const v = { Fine:"OK to apply", Caution:"Check first", Blocker:"Likely blocked" }[g.eligibility] || g.eligibility;
    b = `<div><b>${g.recommend === "go" ? "Worth building a resume for" : "Probably skip this one"}</b></div>
      <div class="mute">Visa: ${esc(v)} · Fit grade ${esc(g.fit)} (A best)</div>
      <div class="row"><select id="m-${j.id}" aria-label="Tailoring mode"><option value="truthful">Truthful</option><option value="normal" selected>Normal</option><option value="aggressive">Aggressive</option></select>
      <button class="primary" data-act="build" data-id="${j.id}">${g.recommend === "skip" ? "Build anyway" : "Build"}</button></div>`;
  }
  if (r && j.status === "done") {
    const f = n => `${BASE}/files/${j.id}/${n}?t=${encodeURIComponent(token)}`;
    b = `<div class="row" style="margin-top:0"><span class="score">${esc(r.score ? r.score.overall : "–")}<span class="mute"> / 10</span></span><span class="mute">${esc(r.score ? r.score.one_line : "")}</span></div>
      <div class="row"><a class="btn primary" target="_blank" href="${f("Nikhil_Swami_Resume.pdf")}">Resume</a>
      <a class="btn" target="_blank" href="${f("Nikhil_Swami_Cover_Letter.pdf")}">Cover letter</a></div>
      ${r.issues ? `<div class="mute" style="margin-top:6px">${r.issues} item(s) to double-check in the dashboard.</div>` : ""}`;
  }
  if (j.status === "error") b = `<div class="err">${esc(j.error)}</div>`;
  return `<div class="job"><div class="top"><div><div class="t">${esc(j.company || j.company_hint || "New job")}</div><div class="mute">${esc(j.role || j.role_hint || "")}</div></div><span class="chip ${cls}">${st}</span></div>${b ? `<div style="margin-top:8px">${b}</div>` : ""}</div>`;
}

function render() {
  const tag = document.activeElement && document.activeElement.tagName;
  const active = tag === "SELECT" || tag === "TEXTAREA" || tag === "INPUT";
  if (active) return;
  if (!token) {
    root.innerHTML = `<h1>Job Desk</h1><div class="mute" style="margin-bottom:8px">First time: paste your token. In Terminal run <b>cat ~/Desktop/ideas/resume-bank/app/token.txt</b></div>
      <input id="tok" aria-label="Token" placeholder="Paste token"><div class="row"><button class="primary" data-act="saveToken">Save</button></div>${msg ? `<div class="err">${esc(msg)}</div>` : ""}`;
    return;
  }
  root.innerHTML = `<h1>Job Desk <a href="#" data-act="openDash">Open dashboard</a></h1>
    <button class="primary full" data-act="sendPage" ${busy ? "disabled" : ""}>${busy ? "Sending…" : "Send this page"}</button>
    <div class="mute" style="margin-top:6px">Select the job description first if the page is busy. <a href="#" data-act="togglePaste">${pasteOpen ? "Hide paste box" : "Or paste the job text"}</a></div>
    ${pasteOpen ? `<textarea id="draft" aria-label="Job description" placeholder="Paste the full job description here">${esc(draft)}</textarea>
      <div class="row"><button class="primary" data-act="sendPaste" ${busy ? "disabled" : ""}>Send pasted text</button></div>` : ""}
    ${msg ? `<div class="err">${esc(msg)}</div>` : ""}
    ${jobs.map((j, i) => (i === 0 || expanded.has(j.id) || j.status === "gated") ? card(j) + (i > 0 && expanded.has(j.id) ? `<div class="mute" style="text-align:right;margin-top:4px"><a href="#" data-act="expand" data-id="${j.id}">Hide</a></div>` : "") : mini(j)).join("")}`;
}
root.addEventListener("click", e => {
  const el = e.target.closest("[data-act]");
  if (!el) return;
  e.preventDefault();
  const fn = window[el.dataset.act];
  if (fn) fn(el.dataset.id);
});
root.addEventListener("input", e => { if (e.target.id === "draft") draft = e.target.value; });
root.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.id === "tok") window.saveToken();
  if ((e.key === "Enter" || e.key === " ") && e.target.classList && e.target.classList.contains("mini")) { e.preventDefault(); window.expand(e.target.dataset.id); } });
setup();
