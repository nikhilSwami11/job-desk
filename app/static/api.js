/* The only file in the browser that talks to the server. fetch is injectable so it can be tested. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.JobApi = factory();
})(typeof self !== "undefined" ? self : this, function () {
  function createApi(token, fetchImpl) {
    const doFetch = fetchImpl || ((...a) => fetch(...a));
    async function call(path, opts) {
      const r = await doFetch(path, { ...opts, headers: { "Content-Type": "application/json", "X-Token": token } });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Error " + r.status);
      return j;
    }
    const post = (path, body) => call(path, { method: "POST", body: JSON.stringify(body || {}) });
    return {
      list: () => call("/api/jobs"),
      create: fields => post("/api/jobs", fields),
      generate: (id, mode) => post(`/api/jobs/${encodeURIComponent(id)}/generate`, { mode }),
      retry: id => post(`/api/jobs/${encodeURIComponent(id)}/retry`, {}),
    };
  }
  return { createApi };
});
