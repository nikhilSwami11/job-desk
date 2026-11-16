/* The controller: owns the state, wires events, calls the API, and asks views.js for HTML. No rules and no markup live here. */
(() => {
  const L = JobLogic, V = JobViews;
  const token = document.querySelector('meta[name="jd-token"]').content;
  const api = JobApi.createApi(token);
  const $ = id => document.getElementById(id);
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode: fine */ } },
  };

  const handled = new Set(store.get("jd.handled", []));     // jobs whose resume he has opened
  const dismissed = new Set(store.get("jd.dismissed", []));  // jobs he moved on from
  const ui = { mode: store.get("jd.mode", "normal"), kw: {}, showMoved: false };
  let jobs = [], prev = {}, first = true, lastNext = "";
  const sig = { next: "", rows: "", detail: "" };

  const toast = m => { const t = $("toast"); t.textContent = m; t.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("on"), 2200); };
  const wide = () => window.matchMedia("(min-width: 900px)").matches;
  const selected = () => {
    const r = L.parseRoute(location.hash);
    if (r.id) return jobs.find(j => j.id === r.id) || null;
    return wide() ? L.priorityJob(jobs, dismissed, handled) : null;
  };
  const remember = (set, key, id) => { set.add(id); store.set(key, [...set]); };

  /* ---------- render ---------- */
  function renderChrome() {
    const r = L.parseRoute(location.hash), j = selected();
    for (const v of ["jobs", "mail", "tasks", "reels"]) $(v + "view").hidden = v !== r.view;
    const detail = !!r.id && r.view === "jobs";
    $("jobsview").classList.toggle("has-detail", detail);
    $("app").classList.toggle("has-detail", detail);
    document.querySelectorAll("#nav a").forEach(a => a.setAttribute("aria-current", a.dataset.v === r.view ? "page" : "false"));
    $("ttl").textContent = r.view === "jobs" ? (detail && j ? L.name(j) : "Job Desk") : r.view[0].toUpperCase() + r.view.slice(1);
    const n = L.needsAttention(jobs, dismissed, handled), b = $("badge");
    b.hidden = !n; b.textContent = n;
  }

  function renderNext() {
    const s = L.nextStep(jobs, dismissed, handled), html = V.nextHtml(s);
    if (s.key + html === sig.next) return;
    sig.next = s.key + html;
    const el = $("next");
    el.innerHTML = html;
    el.classList.remove("sweep");
    if (s.key !== lastNext) { void el.offsetWidth; el.classList.add("sweep"); }
    lastNext = s.key;
  }

  function renderRows() {
    const sel = selected(), shown = ui.showMoved ? jobs : L.live(jobs, dismissed);
    const hidden = jobs.length - L.live(jobs, dismissed).length;
    const s = JSON.stringify([shown, hidden, ui.showMoved, sel && sel.id, [...handled]]);
    if (s === sig.rows) return;
    sig.rows = s;
    $("rows").innerHTML = V.rowsHtml(shown, { selectedId: sel && sel.id, handled });
    $("moved").innerHTML = V.movedHtml(hidden, ui.showMoved);
  }

  function renderDetail() {
    const j = selected();
    const ctx = j ? { mode: ui.mode, selKw: ui.kw[j.id] || null, downloaded: handled.has(j.id), token } : null;
    const s = JSON.stringify([j, ctx]);
    if (s === sig.detail) return;
    sig.detail = s;
    const el = $("detail"), f = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.fid;
    el.innerHTML = j ? V.detailHtml(j, ctx) : V.emptyDetailHtml();
    if (f) { const n = el.querySelector(`[data-fid="${f}"]`); if (n) n.focus({ preventScroll: true }); }
  }
  const render = () => { renderChrome(); renderNext(); renderRows(); renderDetail(); };

  /* ---------- actions ---------- */
  async function advance(id, what) {
    try { await (what === "retry" ? api.retry(id) : api.generate(id, ui.mode)); await refresh(); }
    catch (e) { toast(e.message); }
  }

  $("paste").addEventListener("submit", async e => {
    e.preventDefault(); $("msg").textContent = ""; $("go").disabled = true;
    try {
      const j = await api.create({ jd: $("jd").value, company: $("company").value, role: $("role").value, url: $("url").value });
      ["jd", "company", "role", "url"].forEach(i => { $(i).value = ""; });
      await refresh(); location.hash = "#job/" + j.id;
    } catch (err) { $("msg").textContent = err.message; }
    $("go").disabled = false;
  });

  document.addEventListener("click", e => {
    const t = e.target.closest("[data-go],[data-paste],[data-build],[data-retry],[data-moveon],[data-kw],[data-dl],[data-toggle-moved],[data-na]");
    if (!t) return;
    const d = t.dataset;
    if (d.go) location.hash = "#job/" + d.go;
    else if (t.hasAttribute("data-paste")) { location.hash = "#jobs"; $("jd").focus(); }
    else if (d.build) advance(d.build, "generate");
    else if (d.retry) advance(d.retry, "retry");
    else if (d.moveon) { remember(dismissed, "jd.dismissed", d.moveon); location.hash = "#jobs"; render(); }
    else if (d.kw) { const j = selected(); if (j) { ui.kw[j.id] = ui.kw[j.id] === d.kw ? null : d.kw; render(); } }
    else if (t.hasAttribute("data-dl")) { const j = selected(); if (j) { remember(handled, "jd.handled", j.id); setTimeout(render, 50); } }
    else if (t.hasAttribute("data-toggle-moved")) { ui.showMoved = !ui.showMoved; render(); }
    else if (t.hasAttribute("data-na")) toast("Not connected yet.");
  });
  document.addEventListener("change", e => {
    if (e.target.name === "mode") { ui.mode = e.target.value; store.set("jd.mode", ui.mode); render(); }
  });
  $("back").addEventListener("click", () => { location.hash = "#jobs"; });
  window.addEventListener("hashchange", () => { sig.rows = sig.detail = ""; render(); window.scrollTo(0, 0); });

  /* ---------- polling and notifications ---------- */
  function notify(j) {
    const msg = j.status === "gated" ? `Fit check ready: ${L.name(j)}` : j.status === "done" ? `Resume ready: ${L.name(j)}` : null;
    if (msg && "Notification" in window && Notification.permission === "granted") new Notification("Job Desk", { body: msg });
  }
  async function refresh() {
    try {
      jobs = await api.list();
      for (const j of jobs) { if (!first && prev[j.id] && prev[j.id] !== j.status) notify(j); prev[j.id] = j.status; }
      first = false;
      render();
    } catch (e) { $("next").textContent = e.message; sig.next = ""; }
  }

  if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
  render(); refresh(); setInterval(refresh, 3000);
})();
