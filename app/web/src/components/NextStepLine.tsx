import type { ReactNode } from "react";
import type { NextStep } from "../types";

interface Props { step: NextStep; onGo: (jobId: string) => void; onPaste: () => void }

/** The one sentence that says what to do next. The parent keys it by step.key so the highlighter sweeps when it changes. */
export function NextStepLine({ step, onGo, onPaste }: Props) {
  const go = (id: string, label: string) => <button type="button" className="hl y" onClick={() => onGo(id)}>{label}</button>;
  let body: ReactNode;
  if (step.kind === "paste") {
    body = <>Nothing waiting. <button type="button" className="hl y" onClick={onPaste}>Paste a job.</button></>;
  } else if (step.kind === "error") {
    body = <>{step.name} hit a problem. {go(step.jobId, "See what went wrong")}</>;
  } else if (step.kind === "gated") {
    body = <>{step.name}&rsquo;s fit check is ready. {go(step.jobId, step.risky ? "See why it is risky" : "Pick how to tailor it")}</>;
  } else if (step.kind === "download") {
    body = <>{step.name} is ready to {go(step.jobId, "download")}.</>;
  } else {
    body = <>Working on {step.name}. You can leave and come back.</>;
  }
  return <p className="next sweep" aria-live="polite">{body}</p>;
}
