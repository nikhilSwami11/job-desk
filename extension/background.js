importScripts("common.js");

const NAMES = { gated: "Fit check ready", done: "Resume ready", error: "Problem" };

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "send", title: "Tailor resume for this job", contexts: ["page", "selection"] });
  chrome.alarms.create("poll", { periodInMinutes: 0.5 });
});
chrome.runtime.onStartup.addListener(() => chrome.alarms.create("poll", { periodInMinutes: 0.5 }));

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    const j = await sendTab(tab);
    note("sent-" + j.id, "Job Desk", "Sent. Checking fit now. You'll get a notification when it's ready.");
    poll();
  } catch (e) { note("err-" + Date.now(), "Job Desk", e.message); }
});

function note(id, title, message) {
  chrome.notifications.create(id, { type: "basic", iconUrl: "icon128.png", title, message });
}
chrome.notifications.onClicked.addListener(() => chrome.tabs.create({ url: BASE + "/" }));

async function poll() {
  let jobs;
  try { jobs = await api("/api/jobs"); } catch (e) { chrome.action.setBadgeText({ text: "" }); return; }
  const { seen } = await chrome.storage.local.get("seen");
  const first = !seen;
  const next = {};
  for (const j of jobs) {
    next[j.id] = j.status;
    if (!first && seen[j.id] !== j.status && NAMES[j.status]) {
      const who = [j.company, j.role].filter(Boolean).join(" · ") || "your job";
      let msg = who;
      if (j.status === "gated" && j.gate) msg = `${who}\nVisa: ${j.gate.eligibility}. Fit: ${j.gate.fit}. Open to continue.`;
      if (j.status === "done" && j.result && j.result.score) msg = `${who}\nMatch ${j.result.score.overall}/10. Resume and cover letter are ready.`;
      if (j.status === "error") msg = `${who}\n${j.error || "Something went wrong."}`;
      note(`${j.id}-${j.status}`, "Job Desk: " + NAMES[j.status], msg);
    }
  }
  await chrome.storage.local.set({ seen: next });
  const waiting = jobs.filter(j => j.status === "gated").length;
  const busy = jobs.some(j => ["queued", "gating", "generating"].includes(j.status));
  chrome.action.setBadgeBackgroundColor({ color: "#1d4ed8" });
  chrome.action.setBadgeText({ text: waiting ? String(waiting) : busy ? "…" : "" });
}
chrome.alarms.onAlarm.addListener(a => { if (a.name === "poll") poll(); });
chrome.runtime.onMessage.addListener(m => { if (m === "poll") poll(); });
