// Shared by the service worker and the popup.
const BASE = "http://127.0.0.1:8787";

async function getToken() {
  const { token } = await chrome.storage.local.get("token");
  return token || "";
}

async function api(path, opts = {}) {
  const token = await getToken();
  if (!token) throw new Error("Paste your token first (see the popup).");
  let r;
  try {
    r = await fetch(BASE + path, { ...opts, headers: { "Content-Type": "application/json", "X-Token": token } });
  } catch (e) {
    throw new Error("Job Desk server is not running. Start it with: python3 -I app/server.py");
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(r.status === 401 ? "Token is wrong. Paste app/token.txt again." : (j.error || "Error " + r.status));
  return j;
}

// Runs inside the page: the selection if there is a real one, else the main text.
function grabPage() {
  const sel = String(getSelection() || "").trim();
  if (sel.length > 200) return { text: sel, from: "selection" };
  const el = document.querySelector("main, article, [role=main]") || document.body;
  return { text: (el.innerText || "").trim(), from: "page" };
}

async function sendTab(tab) {
  const [res] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: grabPage });
  const { text } = res.result || {};
  if (!text || text.length < 80) throw new Error("Could not find job text on this page. Select the description and try again.");
  return api("/api/jobs", { method: "POST", body: JSON.stringify({ jd: text.slice(0, 40000), url: tab.url || "" }) });
}
