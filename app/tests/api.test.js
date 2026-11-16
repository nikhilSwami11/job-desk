const test = require("node:test");
const assert = require("node:assert");
const { createApi } = require("../static/api.js");

function fake(status, body) {
  const calls = [];
  const f = async (path, opts) => { calls.push({ path, opts }); return { ok: status < 400, status, json: async () => body }; };
  f.calls = calls;
  return f;
}

test("every request carries the token and JSON content type", async () => {
  const f = fake(200, []);
  await createApi("T0KEN", f).list();
  assert.equal(f.calls[0].opts.headers["X-Token"], "T0KEN");
  assert.equal(f.calls[0].opts.headers["Content-Type"], "application/json");
});

test("create posts the fields", async () => {
  const f = fake(201, { id: "1" });
  const r = await createApi("t", f).create({ jd: "x", company: "A" });
  assert.deepEqual([f.calls[0].path, f.calls[0].opts.method], ["/api/jobs", "POST"]);
  assert.deepEqual(JSON.parse(f.calls[0].opts.body), { jd: "x", company: "A" });
  assert.equal(r.id, "1");
});

test("generate sends the mode and retry hits its own endpoint", async () => {
  const f = fake(202, {});
  const api = createApi("t", f);
  await api.generate("abc", "aggressive");
  await api.retry("abc");
  assert.equal(f.calls[0].path, "/api/jobs/abc/generate");
  assert.deepEqual(JSON.parse(f.calls[0].opts.body), { mode: "aggressive" });
  assert.equal(f.calls[1].path, "/api/jobs/abc/retry");
});

test("ids are URL-encoded", async () => {
  const f = fake(202, {});
  await createApi("t", f).generate("a/b", "normal");
  assert.equal(f.calls[0].path, "/api/jobs/a%2Fb/generate");
});

test("server errors surface their message, with a fallback", async () => {
  await assert.rejects(createApi("t", fake(409, { error: "already running" })).retry("x"), /already running/);
  await assert.rejects(createApi("t", fake(500, {})).list(), /Error 500/);
});
