import { stageIndex } from "../lib/logic";
import type { Job } from "../types";
import { Icon } from "./Icon";

export function Track({ job, downloaded }: { job: Job; downloaded: boolean }) {
  const idx = stageIndex(job);
  return (
    <ol className="track" aria-label="Progress">
      {["Check", "Build", "Download"].map((name, i) => {
        const done = i < idx || (i === 2 && downloaded);
        return <li key={name} className={done ? "done" : i === idx ? "now" : undefined}>{done && <Icon name="tick" />}{name}</li>;
      })}
    </ol>
  );
}
