import { useState, type FormEvent, type RefObject } from "react";
import type { NewJobFields } from "../types";

interface Props { onSubmit: (fields: NewJobFields) => Promise<void>; textareaRef: RefObject<HTMLTextAreaElement | null> }

const EMPTY: NewJobFields = { jd: "", company: "", role: "", url: "" };

export function PasteForm({ onSubmit, textareaRef }: Props) {
  const [f, setF] = useState<NewJobFields>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof NewJobFields) => (e: { target: { value: string } }) => setF(prev => ({ ...prev, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await onSubmit(f);
      setF(EMPTY);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setBusy(false);
  }

  return (
    <form className="paste" onSubmit={submit}>
      <label className="vh" htmlFor="jd">Job description</label>
      <textarea id="jd" ref={textareaRef} value={f.jd} onChange={set("jd")} placeholder="Paste the whole job description here" />
      <details>
        <summary>Add company, role or link (optional)</summary>
        <div className="three">
          <input aria-label="Company" placeholder="Company" autoComplete="off" value={f.company} onChange={set("company")} />
          <input aria-label="Role" placeholder="Role" autoComplete="off" value={f.role} onChange={set("role")} />
          <input aria-label="Job link" placeholder="Job link" autoComplete="off" value={f.url} onChange={set("url")} />
        </div>
      </details>
      <div className="row">
        <button className="btn go" type="submit" disabled={busy}>Check fit</button>
        <span className="err" role="alert">{error}</span>
      </div>
    </form>
  );
}
