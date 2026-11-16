import { describe, expect, it, vi } from "vitest";
import { createApi, fileUrl, readToken } from "./api";

const fake = (status: number, body: unknown) =>
  vi.fn(async (_p: string, _o?: RequestInit) => ({ ok: status < 400, status, json: async () => body }));
const headersOf = (f: ReturnType<typeof fake>) => f.mock.calls[0][1]!.headers as Record<string, string>;

describe("createApi", () => {
  it("sends the token and JSON content type on every request", async () => {
    const f = fake(200, []);
    await createApi("T0KEN", f).list();
    expect(headersOf(f)).toMatchObject({ "X-Token": "T0KEN", "Content-Type": "application/json" });
  });
  it("create posts the fields", async () => {
    const f = fake(201, { id: "1" });
    const r = await createApi("t", f).create({ jd: "x", company: "A", role: "", url: "" });
    expect(f.mock.calls[0][0]).toBe("/api/jobs");
    expect(f.mock.calls[0][1]!.method).toBe("POST");
    expect(JSON.parse(f.mock.calls[0][1]!.body as string)).toEqual({ jd: "x", company: "A", role: "", url: "" });
    expect(r).toEqual({ id: "1" });
  });
  it("generate sends the mode and retry hits its own endpoint", async () => {
    const f = fake(202, {});
    const api = createApi("t", f);
    await api.generate("abc", "aggressive");
    await api.retry("abc");
    expect(f.mock.calls[0][0]).toBe("/api/jobs/abc/generate");
    expect(JSON.parse(f.mock.calls[0][1]!.body as string)).toEqual({ mode: "aggressive" });
    expect(f.mock.calls[1][0]).toBe("/api/jobs/abc/retry");
  });
  it("ids are URL-encoded", async () => {
    const f = fake(202, {});
    await createApi("t", f).generate("a/b", "normal");
    expect(f.mock.calls[0][0]).toBe("/api/jobs/a%2Fb/generate");
  });
  it("server errors surface their message, with a fallback", async () => {
    await expect(createApi("t", fake(409, { error: "already running" })).retry("x")).rejects.toThrow("already running");
    await expect(createApi("t", fake(500, {})).list()).rejects.toThrow("Error 500");
  });
});

describe("fileUrl and readToken", () => {
  it("encodes every part of a download link", () => {
    expect(fileUrl("20261115-1", "Nikhil_Swami_Resume.pdf", "to ken")).toBe("/files/20261115-1/Nikhil_Swami_Resume.pdf?t=to%20ken");
  });
  it("reads the token the server put in the page", () => {
    document.head.innerHTML = '<meta name="jd-token" content="abc123">';
    expect(readToken()).toBe("abc123");
  });
  it("does not treat the unreplaced placeholder as a token", () => {
    document.head.innerHTML = '<meta name="jd-token" content="__TOKEN__">';
    expect(readToken()).toBe("");
  });
});
