import { jobName, rowState } from "../lib/logic";
import { num } from "../lib/logic";
import type { Job } from "../types";

interface Props {
  jobs: Job[];
  selectedId: string | null;
  handled: ReadonlySet<string>;
  movedCount: number;
  showMoved: boolean;
  onSelect: (id: string) => void;
  onToggleMoved: () => void;
}

function Score({ job }: { job: Job }) {
  if (job.status === "done" && job.result?.score) {
    const v = num(job.result.score.overall);
    return <span className="sc" aria-label={`Score ${v} out of 10`}>{v}<small>/10</small></span>;
  }
  if (job.gate && job.gate.fit && job.gate.fit !== "-") return <span className="sc" aria-label={`Fit grade ${job.gate.fit}`}>{job.gate.fit}</span>;
  return <span className="sc mute" aria-hidden="true">–</span>;
}

export function JobList({ jobs, selectedId, handled, movedCount, showMoved, onSelect, onToggleMoved }: Props) {
  return (
    <>
      <ul className="rows">
        {jobs.map(j => {
          const s = rowState(j, handled);
          return (
            <li key={j.id}>
              <button type="button" className="row-btn" aria-current={selectedId === j.id ? "true" : undefined} onClick={() => onSelect(j.id)}>
                <span>
                  <span className="name">{jobName(j)}</span>
                  <span className="role">{j.role || j.role_hint}</span>
                  <span className="state"><span className={s.style === "go" ? "hl y" : s.style}>{s.text}</span></span>
                </span>
                <Score job={j} />
              </button>
            </li>
          );
        })}
      </ul>
      <div className="moved">
        {movedCount > 0 && (
          <button type="button" className="linkbtn" onClick={onToggleMoved}>
            {showMoved ? "Hide" : "Show"} {movedCount} moved-on job{movedCount > 1 ? "s" : ""}
          </button>
        )}
      </div>
    </>
  );
}
