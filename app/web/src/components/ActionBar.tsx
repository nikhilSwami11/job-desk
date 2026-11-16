import { PRIMARY_FILE } from "../lib/constants";
import { fileUrl } from "../lib/api";
import { skipish } from "../lib/logic";
import type { Job } from "../types";

interface Props {
  job: Job;
  token: string;
  onBuild: (id: string) => void;
  onRetry: (id: string) => void;
  onMoveOn: (id: string) => void;
  onDownload: (id: string) => void;
}

/** The one primary action for this job, pinned above the tab bar on a phone. */
export function ActionBar({ job, token, onBuild, onRetry, onMoveOn, onDownload }: Props) {
  if (job.status === "gated") {
    return skipish(job) ? (
      <div className="actionbar">
        <button type="button" className="btn go" onClick={() => onMoveOn(job.id)}>Move on</button>
        <button type="button" className="linkbtn" onClick={() => onBuild(job.id)}>Build anyway</button>
      </div>
    ) : (
      <div className="actionbar">
        <button type="button" className="btn go" onClick={() => onBuild(job.id)}>Build resume and cover letter</button>
        <span className="note">About a minute. Nothing is sent anywhere.</span>
      </div>
    );
  }
  if (job.status === "done" && job.result?.files.includes(PRIMARY_FILE)) {
    return (
      <div className="actionbar">
        <a className="btn go" target="_blank" rel="noopener" href={fileUrl(job.id, PRIMARY_FILE, token)} onClick={() => onDownload(job.id)}>Download resume (PDF)</a>
      </div>
    );
  }
  if (job.status === "error") {
    return <div className="actionbar"><button type="button" className="btn go" onClick={() => onRetry(job.id)}>Try again</button></div>;
  }
  return null;
}
