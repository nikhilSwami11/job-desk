import { useCallback, useEffect, useRef, useState } from "react";
import type { Api } from "../lib/api";
import { jobName } from "../lib/logic";
import type { Job } from "../types";

function notify(j: Job) {
  const msg = j.status === "gated" ? `Fit check ready: ${jobName(j)}` : j.status === "done" ? `Resume ready: ${jobName(j)}` : null;
  if (msg && "Notification" in window && Notification.permission === "granted") new Notification("Job Desk", { body: msg });
}

/** Polls the server, and sends a desktop notification when a job reaches "gated" or "done". */
export function useJobs(api: Api, intervalMs = 3000) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);
  const seen = useRef<Record<string, string> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await api.list();
      const before = seen.current;
      if (before) for (const j of next) if (before[j.id] && before[j.id] !== j.status) notify(j);
      seen.current = Object.fromEntries(next.map(j => [j.id, j.status]));
      setJobs(next);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [api]);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), intervalMs);
    return () => clearInterval(t);
  }, [refresh, intervalMs]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") void Notification.requestPermission();
  }, []);

  return { jobs, error, refresh };
}
