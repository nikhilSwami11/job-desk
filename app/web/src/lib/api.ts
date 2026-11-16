import type { Job, Mode, NewJobFields } from "../types";

export interface Api {
  list(): Promise<Job[]>;
  create(fields: NewJobFields): Promise<Job>;
  generate(id: string, mode: Mode): Promise<Job>;
  retry(id: string): Promise<Job>;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Pick<Response, "ok" | "status" | "json">>;

/** The only module that talks to the server. fetch is injectable so it can be tested. */
export function createApi(token: string, fetchImpl: FetchLike = (i, o) => fetch(i, o)): Api {
  async function call<T>(path: string, init?: RequestInit): Promise<T> {
    const r = await fetchImpl(path, { ...init, headers: { "Content-Type": "application/json", "X-Token": token } });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((body as { error?: string }).error || "Error " + r.status);
    return body as T;
  }
  const post = <T,>(path: string, body: unknown = {}) => call<T>(path, { method: "POST", body: JSON.stringify(body) });
  return {
    list: () => call<Job[]>("/api/jobs"),
    create: fields => post<Job>("/api/jobs", fields),
    generate: (id, mode) => post<Job>(`/api/jobs/${encodeURIComponent(id)}/generate`, { mode }),
    retry: id => post<Job>(`/api/jobs/${encodeURIComponent(id)}/retry`),
  };
}

/** The server puts the token in a <meta> tag. In `npm run dev` there is no server page, so use the dev token. */
export function readToken(doc: Document = document): string {
  const t = doc.querySelector('meta[name="jd-token"]')?.getAttribute("content") ?? "";
  return t && t !== "__TOKEN__" ? t : typeof __DEV_TOKEN__ === "string" ? __DEV_TOKEN__ : "";
}

export const fileUrl = (jobId: string, name: string, token: string) =>
  `/files/${encodeURIComponent(jobId)}/${encodeURIComponent(name)}?t=${encodeURIComponent(token)}`;
