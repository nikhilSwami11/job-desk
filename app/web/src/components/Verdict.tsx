import { gradeTone, short, skipish } from "../lib/logic";
import type { Job } from "../types";

const VISA: Record<string, [label: string, mark: "g" | "a" | "r"]> = {
  Fine: ["OK to apply", "g"], Caution: ["Check first", "a"], Blocker: ["Likely blocked", "r"],
};

/** The go or skip call, in words and marker, plus what you have, what is partly there and what is missing. */
export function Verdict({ job }: { job: Job }) {
  const g = job.gate;
  if (!g) return null;
  const skip = skipish(job);
  const visa = VISA[g.eligibility] ?? [g.eligibility, "a" as const];
  const fit = (g.fit || "-").trim().toUpperCase()[0];
  const ft = gradeTone(fit);
  const groups: [string, string[]][] = [["You have", g.met], ["Partly", g.partly], ["Missing", g.missing]];
  const shown = groups.filter(([, a]) => a && a.length);
  return (
    <>
      <h2 className="verdict">{skip ? <span className="pen">Skip this one</span> : <span className="hl g">Worth applying</span>}</h2>
      <p className="ask"><b>Can you apply?</b><span className={`hl ${visa[1]}`}>{visa[0]}</span> {g.eligibility_reason}</p>
      <div>
        <b>Fit grade</b> <span className="mute">A is best, F is worst</span>
        <ol className="grade" role="img" aria-label={`Fit grade ${fit}`}>
          {"ABCDEF".split("").map(L => <li key={L} className={L === fit ? `on ${ft}` : ""}>{L}</li>)}
        </ol>
        <span className="mute">Role focus: {short(g.role_type, 70)}</span>
      </div>
      <div className="sets">
        {g.met?.length > 0 && <p><b>You have</b> {g.met.map((x, i) => <span key={i} className="hl g">{short(x)} </span>)}</p>}
        {g.partly?.length > 0 && <p><b>Partly</b> {g.partly.map((x, i) => <span key={i} className="hl a">{short(x)} </span>)}</p>}
        {g.missing?.length > 0 && <p><b>Missing</b> {g.missing.map((x, i) => <span key={i} className="pen">{short(x)} &nbsp;</span>)}</p>}
      </div>
      {shown.length > 0 && (
        <details className="more">
          <summary>The reasons behind this</summary>
          <div className="reasons">
            {shown.map(([title, items]) => (
              <div key={title}><p><b>{title}</b></p><ul>{items.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
            ))}
            {g.role_type && <div><p><b>Role focus</b></p><ul><li>{g.role_type}</li></ul></div>}
          </div>
        </details>
      )}
    </>
  );
}
