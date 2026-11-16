import { useEffect, useMemo, useRef, useState } from "react";
import { Nav, TopBand } from "./components/Chrome";
import { Sprite } from "./components/Icon";
import { JobDetail } from "./components/JobDetail";
import { JobList } from "./components/JobList";
import { NextStepLine } from "./components/NextStepLine";
import { PasteForm } from "./components/PasteForm";
import { MailView, ReelsView, TasksView } from "./components/SampleScreens";
import { go, useRoute } from "./hooks/useRoute";
import { useJobs } from "./hooks/useJobs";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { useStoredSet, useStoredState } from "./hooks/useStored";
import { useToast } from "./hooks/useToast";
import type { Api } from "./lib/api";
import { jobName, live, needsAttention, nextStep, priorityJob } from "./lib/logic";
import type { Mode, NewJobFields } from "./types";

/** The controller: owns state, wires events to the API, and passes plain props to the components. No rules live here. */
export default function App({ api, token }: { api: Api; token: string }) {
  const route = useRoute();
  const { jobs, error, refresh } = useJobs(api);
  const [handled, markHandled] = useStoredSet("jd.handled"); // jobs whose resume he has opened
  const [dismissed, dismiss] = useStoredSet("jd.dismissed"); // jobs he moved on from
  const [mode, setMode] = useStoredState<Mode>("jd.mode", "normal");
  const [kw, setKw] = useState<Record<string, string | null>>({});
  const [showMoved, setShowMoved] = useState(false);
  const [toast, say] = useToast();
  const wide = useMediaQuery("(min-width: 900px)");
  const pasteRef = useRef<HTMLTextAreaElement>(null);

  const shown = showMoved ? jobs : live(jobs, dismissed);
  const selected = route.id ? jobs.find(j => j.id === route.id) ?? null : wide ? priorityJob(jobs, dismissed, handled) : null;
  const step = useMemo(() => nextStep(jobs, dismissed, handled), [jobs, dismissed, handled]);
  const badge = needsAttention(jobs, dismissed, handled);
  const hasDetail = route.view === "jobs" && !!route.id;
  const title = route.view === "jobs" ? (hasDetail && selected ? jobName(selected) : "Job Desk") : route.view[0].toUpperCase() + route.view.slice(1);

  useEffect(() => { window.scrollTo(0, 0); }, [route.view, route.id]);

  async function guard(run: () => Promise<unknown>) {
    try { await run(); await refresh(); } catch (e) { say(e instanceof Error ? e.message : String(e)); }
  }
  async function createJob(fields: NewJobFields) {
    const job = await api.create(fields);
    await refresh();
    go("#job/" + job.id);
  }
  const notYet = () => say("Not connected yet.");

  return (
    <div className={"app" + (hasDetail ? " has-detail" : "")}>
      <Sprite />
      <TopBand title={title} showBack={hasDetail} onBack={() => go("#jobs")} />
      <Nav view={route.view} badge={badge} />
      <main>
        <section id="jobsview" className={hasDetail ? "has-detail" : undefined} aria-label="Jobs" hidden={route.view !== "jobs"}>
          <div id="listcol">
            {error ? <p className="next"><span className="pen">{error}</span></p>
              : <NextStepLine key={step.key} step={step} onGo={id => go("#job/" + id)} onPaste={() => { go("#jobs"); pasteRef.current?.focus(); }} />}
            <PasteForm onSubmit={createJob} textareaRef={pasteRef} />
            <JobList jobs={shown} selectedId={selected?.id ?? null} handled={handled} movedCount={jobs.length - live(jobs, dismissed).length}
              showMoved={showMoved} onSelect={id => go("#job/" + id)} onToggleMoved={() => setShowMoved(s => !s)} />
          </div>
          <article className="detail" id="detail" aria-live="polite">
            {selected ? (
              <JobDetail job={selected} token={token} mode={mode} onMode={setMode}
                selKw={kw[selected.id] ?? null} onSelKw={t => setKw(k => ({ ...k, [selected.id]: t }))}
                downloaded={handled.has(selected.id)}
                onBuild={id => void guard(() => api.generate(id, mode))} onRetry={id => void guard(() => api.retry(id))}
                onMoveOn={id => { dismiss(id); go("#jobs"); }} onDownload={markHandled} />
            ) : <p className="empty">Paste a job on the left. Your fit check and resume show up here.</p>}
          </article>
        </section>
        {route.view === "mail" && <section className="wide" aria-label="Mail"><MailView onNotYet={notYet} /></section>}
        {route.view === "tasks" && <section className="wide" aria-label="Tasks"><TasksView onNotYet={notYet} /></section>}
        {route.view === "reels" && <section className="wide" aria-label="Reels"><ReelsView onNotYet={notYet} /></section>}
      </main>
      <div id="toast" className={toast ? "on" : undefined} role="status" aria-live="polite">{toast}</div>
    </div>
  );
}
