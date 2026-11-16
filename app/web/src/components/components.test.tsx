import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { doneJob, gate, job } from "../test/factories";
import { JobDetail, type DetailProps } from "./JobDetail";
import { NextStepLine } from "./NextStepLine";
import { Markdownish } from "./Markdownish";
import { Ruler } from "./Ruler";
import type { Job } from "../types";

const EVIL = `<img src=x onerror="alert(1)">`;

function detail(j: Job, over: Partial<DetailProps> = {}) {
  const props: DetailProps = {
    job: j, token: "tok en", mode: "normal", onMode: vi.fn(), selKw: null, onSelKw: vi.fn(), downloaded: false,
    onBuild: vi.fn(), onRetry: vi.fn(), onMoveOn: vi.fn(), onDownload: vi.fn(), ...over,
  };
  return { ...render(<JobDetail {...props} />), props };
}

describe("finished job", () => {
  it("leads with the score, and shows keywords and a download link with an encoded token", () => {
    detail(doneJob());
    expect(screen.getByLabelText("Match score 6.5 out of 10")).toBeInTheDocument();
    expect(screen.getByText("Mixed match")).toBeInTheDocument();
    expect(screen.getByText(/Keywords: 1 of 2/)).toBeInTheDocument();
    const dl = screen.getByRole("link", { name: "Download resume (PDF)" });
    expect(dl).toHaveAttribute("href", "/files/20261115-173912-6273/Nikhil_Swami_Resume.pdf?t=tok%20en");
    expect(screen.queryByText(/resume\.json/)).toBeNull();
  });

  it("folds the fit check below the score", () => {
    const { container } = detail(doneJob());
    const html = container.innerHTML;
    expect(html.indexOf("Match score")).toBeLessThan(html.indexOf("Fit check: Worth applying, grade B"));
  });

  it("tapping a keyword asks to select it; the selected one explains itself", async () => {
    const user = userEvent.setup();
    const { props, rerender } = detail(doneJob());
    await user.click(screen.getByRole("button", { name: /Ruby/ }));
    expect(props.onSelKw).toHaveBeenCalledWith("Ruby");
    rerender(<JobDetail {...props} selKw="Ruby" />);
    const note = document.querySelector(".kwnote");
    expect(note).toHaveTextContent("Ruby is not in your resume.");
    expect(note).toHaveTextContent("Core language.");
    expect(note).toHaveTextContent("Not in your bank");
  });

  it("tapping the selected keyword again clears it", async () => {
    const user = userEvent.setup();
    const { props } = detail(doneJob(), { selKw: "Go" });
    await user.click(screen.getByRole("button", { name: /Go/ }));
    expect(props.onSelKw).toHaveBeenCalledWith(null);
  });

  it("downloading marks the job as handled", async () => {
    const user = userEvent.setup();
    const { props } = detail(doneJob());
    screen.getByRole("link", { name: "Download resume (PDF)" }).addEventListener("click", e => e.preventDefault());
    await user.click(screen.getByRole("link", { name: "Download resume (PDF)" }));
    expect(props.onDownload).toHaveBeenCalledWith("20261115-173912-6273");
  });

  it("warns about issues and extra pages", () => {
    const j = doneJob();
    j.result = { ...j.result!, issues: 2, pages: 2 };
    detail(j);
    expect(screen.getByText(/2 things to double-check/)).toBeInTheDocument();
    expect(screen.getByText(/The resume is 2 pages/)).toBeInTheDocument();
  });

  it("works for older results that have no keyword details or score", () => {
    const j = doneJob();
    j.result = { ...j.result!, score: null, keywords: { matched: ["Go"], missing: ["Ruby"] } };
    detail(j);
    expect(screen.getByText(/Keywords: 1 of 2/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Match score/)).toBeNull();
  });
});

describe("gated job", () => {
  const gated = (g = gate) => job("g1", "gated", { company: "Acme", gate: g });

  it("shows the verdict in words and a mode picker with the chosen mode checked", () => {
    detail(gated(), { mode: "aggressive" });
    expect(screen.getByText("Worth applying")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Aggressive/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Normal/ })).not.toBeChecked();
  });

  it("choosing a mode and pressing Build calls the right handlers", async () => {
    const user = userEvent.setup();
    const { props } = detail(gated());
    await user.click(screen.getByRole("radio", { name: /Truthful/ }));
    expect(props.onMode).toHaveBeenCalledWith("truthful");
    await user.click(screen.getByRole("button", { name: "Build resume and cover letter" }));
    expect(props.onBuild).toHaveBeenCalledWith("g1");
  });

  it("a skip verdict says so, hides the picker, and offers Move on before Build anyway", async () => {
    const user = userEvent.setup();
    const { props } = detail(gated({ ...gate, recommend: "skip" }));
    expect(screen.getByText("Skip this one")).toBeInTheDocument();
    expect(screen.queryByRole("radio")).toBeNull();
    const buttons = screen.getAllByRole("button").map(b => b.textContent);
    expect(buttons.indexOf("Move on")).toBeLessThan(buttons.indexOf("Build anyway"));
    await user.click(screen.getByRole("button", { name: "Move on" }));
    expect(props.onMoveOn).toHaveBeenCalledWith("g1");
  });

  it("marks exactly one fit grade, and the visa answer in words", () => {
    const { container } = detail(gated({ ...gate, eligibility: "Caution" }));
    expect(container.querySelectorAll("ol.grade li.on")).toHaveLength(1);
    expect(screen.getByText("Check first")).toBeInTheDocument();
  });

  it("long reasons show as short chips, with the full text in the folded reasons", () => {
    const { container } = detail(gated({ ...gate, met: ["Go: used in the Onsite Teams report service on AWS"] }));
    expect(container.querySelector(".sets .hl.g")?.textContent?.trim()).toBe("Go");
    expect(screen.getByText("Go: used in the Onsite Teams report service on AWS")).toBeInTheDocument();
  });
});

describe("other states", () => {
  it("error shows the message and Try again", async () => {
    const user = userEvent.setup();
    const { props } = detail(job("e1", "error", { company: "A", error: "boom" }));
    expect(screen.getByText("boom")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(props.onRetry).toHaveBeenCalledWith("e1");
  });

  it("busy jobs show a waiting message and no primary action", () => {
    detail(job("b1", "generating", { company: "A", gate }));
    expect(screen.getByText(/Building your resume/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Build|Try again|Move on/ })).toBeNull();
  });

  it("the progress track marks the stages", () => {
    const { container } = detail(doneJob(), { downloaded: true });
    expect(container.querySelectorAll("ol.track li.done")).toHaveLength(3);
  });
});

describe("safety: server text can never become markup", () => {
  it("renders hostile text as text everywhere", () => {
    const j = doneJob({ company: EVIL, role: EVIL, gate: { ...gate, eligibility_reason: EVIL, met: [EVIL], missing: [EVIL], role_type: EVIL } });
    j.result = { ...j.result!, review: EVIL, score: { overall: 6, skills: 6, experience: 6, level: 6, one_line: EVIL },
      keywords: { matched: [EVIL], missing: [], details: [{ term: EVIL, why: EVIL, yours: EVIL, in_resume: true }] } };
    const { container } = detail(j, { selKw: EVIL });
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("<img");
  });
});

describe("NextStepLine", () => {
  it("covers every kind and wires the highlighted words", async () => {
    const user = userEvent.setup();
    const onGo = vi.fn(), onPaste = vi.fn();
    const { rerender } = render(<NextStepLine step={{ key: "p", kind: "paste" }} onGo={onGo} onPaste={onPaste} />);
    await user.click(screen.getByRole("button", { name: "Paste a job." }));
    expect(onPaste).toHaveBeenCalled();
    rerender(<NextStepLine step={{ key: "d1", kind: "download", jobId: "1", name: "Acme" }} onGo={onGo} onPaste={onPaste} />);
    expect(screen.getByText(/Acme is ready to/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "download" }));
    expect(onGo).toHaveBeenCalledWith("1");
    rerender(<NextStepLine step={{ key: "g1", kind: "gated", jobId: "2", name: "Acme", risky: true }} onGo={onGo} onPaste={onPaste} />);
    expect(screen.getByRole("button", { name: "See why it is risky" })).toBeInTheDocument();
    rerender(<NextStepLine step={{ key: "e1", kind: "error", jobId: "3", name: "Acme" }} onGo={onGo} onPaste={onPaste} />);
    expect(screen.getByRole("button", { name: "See what went wrong" })).toBeInTheDocument();
    rerender(<NextStepLine step={{ key: "b1", kind: "busy", jobId: "4", name: "Acme" }} onGo={onGo} onPaste={onPaste} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("Markdownish and Ruler", () => {
  it("bolds **text** and ## headings without HTML", () => {
    const { container } = render(<Markdownish text={"## Title\n- **ok** and <b>x</b>"} />);
    expect(container.querySelectorAll("b")).toHaveLength(2);
    expect(container.textContent).toContain("<b>x</b>");
  });
  it("ruler clamps out-of-range values", () => {
    const { container, rerender } = render(<Ruler value={15} />);
    expect(container.querySelector("path")?.getAttribute("d")).toBe("M5 9 L300 8");
    rerender(<Ruler value={-3} />);
    expect(container.querySelector("path")?.getAttribute("d")).toBe("M5 9 L6 8");
    expect(within(container).getByRole("img")).toHaveAttribute("aria-label", "-3 on a scale of 0 to 10");
  });
});
