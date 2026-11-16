import { MODES } from "../lib/constants";
import type { Mode } from "../types";

export function ModePicker({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <fieldset className="modes">
      <legend>How hard should it tailor?</legend>
      {(Object.keys(MODES) as Mode[]).map(k => (
        <label key={k} className="mode">
          <input type="radio" name="mode" value={k} checked={mode === k} onChange={() => onChange(k)} />
          <span><b>{MODES[k][0]}</b><span className="d">{MODES[k][1]}</span></span>
        </label>
      ))}
    </fieldset>
  );
}
