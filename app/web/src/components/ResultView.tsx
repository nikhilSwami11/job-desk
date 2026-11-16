import { FILES, PRIMARY_FILE } from "../lib/constants";
import { fileUrl } from "../lib/api";
import { num, scoreWord, tone } from "../lib/logic";
import type { Job, KeywordDetail } from "../types";
import { Markdownish } from "./Markdownish";
import { Ruler } from "./Ruler";

interface Props {
  job: Job;
  token: string;
  selKw: string | null;
  onSelKw: (term: string | null) => void;
  onDownload: (id: string) => void;
}

function keywordRows(job: Job): KeywordDetail[] {
  const kw = job.result?.keywords;
  if (!kw) return [];
  if (kw.details?.length) return kw.details;
  return [...kw.matched.map(term => ({ term, in_resume: true })), ...kw.missing.map(term => ({ term, in_resume: false }))];
}

/** A finished job: the score first, then keywords, other files, what changed. */
export function ResultView({ job, token, selKw, onSelKw, onDownload }: Props) {
  const r = job.result;
  if (!r) return null;
  const sc = r.score;
  const rows = keywordRows(job);
  const matched = rows.filter(d => d.in_resume).length;
  const sel = rows.find(d => d.term === selKw);
  const others = r.files.filter(f => FILES[f] && f !== PRIMARY_FILE);
  const warn: string[] = [];
  if (r.issues) warn.push(`${r.issues} thing${r.issues > 1 ? "s" : ""} to double-check. Open "What changed" below.`);
  if (r.pages !== 1) warn.push(`The resume is ${r.pages} pages. The target is 1.`);
  const sub = (label: string, v: number) => <li><span>{label}</span><Ruler value={Number(v)} small /><b>{num(v)}</b></li>;

  return (
    <>
      {sc && (
        <section className="score" aria-label="Match score">
          <p className="big" aria-label={`Match score ${num(sc.overall)} out of 10`}>
            <span className="num">{num(sc.overall)}</span><span className="of">/10</span>
            <span className={`word hl ${tone(Number(sc.overall))}`}>{scoreWord(Number(sc.overall))}</span>
          </p>
          <Ruler value={Number(sc.overall)} />
          <p className="why">{sc.one_line}</p>
          <ul className="subs">{sub("Skills", sc.skills)}{sub("Experience", sc.experience)}{sub("Level", sc.level)}</ul>
        </section>
      )}
      {warn.length > 0 && <div className="penbox">{warn.map(w => <p key={w}>{w}</p>)}</div>}
      {rows.length > 0 && (
        <>
          <h3 className="sec">Keywords: {matched} of {rows.length} are in your resume</h3>
          <p className="mute tight">Tap a word to see why the job wants it.</p>
          <p className="kws">
            {rows.map(d => (
              <button key={d.term} type="button" className={`kw ${d.in_resume ? "have" : "miss"}`} aria-pressed={selKw === d.term}
                onClick={() => onSelKw(selKw === d.term ? null : d.term)}>
                {d.term}<span className="vh">{d.in_resume ? " (in your resume)" : " (missing)"}</span>
              </button>
            ))}
          </p>
          {sel && (
            <div className="kwnote">
              <b>{sel.term}</b> {sel.in_resume ? "is in your resume." : "is not in your resume."}
              {sel.why && <><br />{sel.why}</>}
              {sel.yours && <><br /><span className="mute">{sel.yours}</span></>}
            </div>
          )}
        </>
      )}
      {others.length > 0 && (
        <>
          <h3 className="sec">Other files</h3>
          <div className="files">
            {others.map(f => <a key={f} className="btn" target="_blank" rel="noopener" href={fileUrl(job.id, f, token)} onClick={() => onDownload(job.id)}>{FILES[f]}</a>)}
          </div>
        </>
      )}
      <details className="more">
        <summary>What changed and what to double-check</summary>
        <div className="review"><Markdownish text={r.review} /></div>
      </details>
      <p className="foot">
        Mode: {job.mode || "normal"}. Saved in your tracker as &quot;drafted&quot;. You send it yourself.
        {job.tokens ? ` ${Math.round(job.tokens / 1000)}k tokens, about $${Number(job.cost).toFixed(2)}.` : ""}
      </p>
    </>
  );
}
