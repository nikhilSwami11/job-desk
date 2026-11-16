import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "./App";
import type { Api } from "./lib/api";
import type { Job } from "./types";
import { doneJob, gate, job } from "./test/factories";

function fakeApi(jobs: Job[], over: Partial<Api> = {}): Api {
  return {
    list: vi.fn(async () => jobs),
    create: vi.fn(async () => job("new1", "queued", { company_hint: "Acme" })),
    generate: vi.fn(async () => job("x", "queued")),
    retry: vi.fn(async () => job("x", "queued")),
    ...over,
  };
}
const open = async (api: Api) => { render(<App api={api} token="tok" />); await screen.findByRole("textbox", { name: "Job description" }); };

describe("the whole app against a fake server", () => {
  it("says what to do next, with the problem first", async () => {
    await open(fakeApi([job("a", "gated", { gate }), job("b", "error", { company: "Orbit", error: "x" })]));
    expect(await screen.findByText(/Orbit hit a problem/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "See what went wrong" })).toBeInTheDocument();
  });

  it("asks you to paste a job when nothing is waiting", async () => {
    await open(fakeApi([]));
    expect(await screen.findByText(/Nothing waiting/)).toBeInTheDocument();
  });

  it("lists jobs with the score for finished ones and the grade for gated ones", async () => {
    await open(fakeApi([doneJob(), job("g", "gated", { company: "Acme", gate })]));
    expect(await screen.findByLabelText("Score 6.5 out of 10")).toBeInTheDocument();
    expect(screen.getByLabelText("Fit grade B")).toBeInTheDocument();
  });

  it("opening a job shows its detail and updates the route", async () => {
    const user = userEvent.setup();
    await open(fakeApi([job("g", "gated", { company: "Acme", gate })]));
    await user.click(await screen.findByRole("button", { name: /Acme/ }));
    expect(window.location.hash).toBe("#job/g");
    expect(await screen.findByText("Worth applying")).toBeInTheDocument();
  });

  it("pasting a job sends the fields and opens the new job", async () => {
    const user = userEvent.setup();
    const api = fakeApi([]);
    await open(api);
    await user.type(screen.getByRole("textbox", { name: "Job description" }), "Backend engineer role");
    await user.click(screen.getByText("Add company, role or link (optional)"));
    await user.type(screen.getByLabelText("Company"), "Acme");
    await user.click(screen.getByRole("button", { name: "Check fit" }));
    await waitFor(() => expect(api.create).toHaveBeenCalledWith({ jd: "Backend engineer role", company: "Acme", role: "", url: "" }));
    await waitFor(() => expect(window.location.hash).toBe("#job/new1"));
    expect(screen.getByRole("textbox", { name: "Job description" })).toHaveValue("");
  });

  it("shows the server's message if pasting fails, and keeps what you typed", async () => {
    const user = userEvent.setup();
    await open(fakeApi([], { create: vi.fn(async () => { throw new Error("JD text is too short"); }) }));
    await user.type(screen.getByRole("textbox", { name: "Job description" }), "short");
    await user.click(screen.getByRole("button", { name: "Check fit" }));
    expect(await screen.findByText("JD text is too short")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Job description" })).toHaveValue("short");
  });

  it("builds with the chosen mode, and remembers it for next time", async () => {
    const user = userEvent.setup();
    const api = fakeApi([job("g", "gated", { company: "Acme", gate })]);
    window.location.hash = "#job/g";
    await open(api);
    await user.click(await screen.findByRole("radio", { name: /Aggressive/ }));
    await user.click(screen.getByRole("button", { name: "Build resume and cover letter" }));
    await waitFor(() => expect(api.generate).toHaveBeenCalledWith("g", "aggressive"));
    expect(JSON.parse(window.localStorage.getItem("jd.mode")!)).toBe("aggressive");
  });

  it("Move on hides the job and leaves a way to show it again", async () => {
    const user = userEvent.setup();
    window.location.hash = "#job/s";
    await open(fakeApi([job("s", "gated", { company: "Fortress", gate: { ...gate, recommend: "skip", eligibility: "Blocker" } })]));
    await user.click(await screen.findByRole("button", { name: "Move on" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: /^Fortress/ })).toBeNull());
    await user.click(screen.getByRole("button", { name: /Show 1 moved-on job/ }));
    expect(await screen.findByRole("button", { name: /Fortress/ })).toBeInTheDocument();
  });

  it("a finished job stops asking for a download once its resume was opened", async () => {
    window.location.hash = "#job/20261115-173912-6273";
    const user = userEvent.setup();
    await open(fakeApi([doneJob()]));
    expect(await screen.findByText(/Stripe is ready to/)).toBeInTheDocument();
    const dl = screen.getByRole("link", { name: "Download resume (PDF)" });
    dl.addEventListener("click", e => e.preventDefault());
    await user.click(dl);
    await waitFor(() => expect(screen.getByText(/Nothing waiting/)).toBeInTheDocument());
  });

  it("the Jobs tab shows how many things need you", async () => {
    await open(fakeApi([job("a", "gated", { gate }), job("b", "error", { error: "x" }), doneJob()]));
    const tab = await screen.findByRole("link", { name: /Jobs/ });
    await waitFor(() => expect(tab).toHaveTextContent("3"));
  });

  it("the sample screens say they are not connected", async () => {
    const user = userEvent.setup();
    window.location.hash = "#mail";
    render(<App api={fakeApi([])} token="tok" />);
    expect(await screen.findByText("Sample screen. Not connected yet.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Draft a reply" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Not connected yet.");
  });

  it("shows a readable error when the server cannot be reached", async () => {
    render(<App api={fakeApi([], { list: vi.fn(async () => { throw new Error("Error 500"); }) })} token="t" />);
    expect(await screen.findByText("Error 500")).toBeInTheDocument();
  });

  it("polls for updates", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const list = vi.fn(async () => [] as Job[]);
    render(<App api={fakeApi([], { list })} token="t" />);
    await screen.findByRole("textbox", { name: "Job description" });
    const first = list.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(3100); });
    expect(list.mock.calls.length).toBeGreaterThan(first);
    vi.useRealTimers();
  });
});
