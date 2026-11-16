import { fmt, isBusy, jobName, skipish } from "../lib/logic";
import type { Job, Mode } from "../types";
import { ActionBar } from "./ActionBar";
import { ModePicker } from "./ModePicker";
import { ResultView } from "./ResultView";
import { Track } from "./Track";
import { Verdict } from "./Verdict";

export interface DetailProps {
  job: Job;
  token: string;
  mode: Mode;
  onMode: (m: Mode) => void;
  selKw: string | null;
  onSelKw: (term: string | null) => void;
  downloaded: boolean;
  onBuild: (id: string) => void;
  onRetry: (id: string) => void;
  onMoveOn: (id: string) => void;
  onDownload: (id: string) => void;
}

export function JobDetail(p: DetailProps) {
  const { job } = p;
  const bar = <ActionBar job={job} token={p.token} onBuild={p.onBuild} onRetry={p.onRetry} onMoveOn={p.onMoveOn} onDownload={p.onDownload} />;
  return (
    <>
      <h2 className="who">{jobName(job)}</h2>
      <p className="meta">{[job.role || job.role_hint, fmt(job.created)].filter(Boolean).join(" · ")}</p>
      <Track job={job} downloaded={p.downloaded} />

      {isBusy(job) && (
        <div className="wait">
          <p className="mark"><span className="hl y">{job.status === "generating" ? "Building your resume and cover letter…" : "Checking visa and fit…"}</span></p>
          <p>You can leave. You will be notified when it is ready.</p>
          <p className="mute">{job.jd_preview}…</p>
        </div>
      )}
      {job.status === "error" && <div className="penbox"><p>{job.error || "Something went wrong."}</p></div>}

      {job.status === "done" && job.result ? (
        <>
          <ResultView job={job} token={p.token} selKw={p.selKw} onSelKw={p.onSelKw} onDownload={p.onDownload} />
          {job.gate && (
            <details className="more">
              <summary>Fit check: {skipish(job) ? "Skip" : "Worth applying"}, grade {job.gate.fit}</summary>
              <Verdict job={job} />
            </details>
          )}
        </>
      ) : (
        <>
          <Verdict job={job} />
          {job.status === "gated" && !skipish(job) && <ModePicker mode={p.mode} onChange={p.onMode} />}
        </>
      )}
      {bar}
    </>
  );
}
