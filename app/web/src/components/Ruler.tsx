import { num, tone } from "../lib/logic";

/** A ruled 0 to 10 scale with a marker stroke up to the value. */
export function Ruler({ value, small = false }: { value: number; small?: boolean }) {
  const v = Number.isFinite(Number(value)) ? Number(value) : 0;
  const x = Math.max(0, Math.min(10, v)) * 30;
  const y = small ? 15 : 17;
  return (
    <svg className="ruler" viewBox={`0 0 300 ${small ? 24 : 38}`} role="img" aria-label={`${num(value)} on a scale of 0 to 10`}>
      <line className="base" x1={0} y1={y} x2={300} y2={y} />
      {Array.from({ length: 11 }, (_, i) => <line key={i} className="tick" x1={i * 30} y1={y} x2={i * 30} y2={y + (small ? 6 : 8)} />)}
      <path className={`mk ${tone(v)}`} d={`M5 ${small ? 8 : 9} L${Math.max(6, x)} ${small ? 7 : 8}`} strokeWidth={small ? 9 : 13} />
      {!small && <>
        <text x={0} y={35} textAnchor="start">0</text>
        <text x={150} y={35} textAnchor="middle">5</text>
        <text x={300} y={35} textAnchor="end">10</text>
      </>}
    </svg>
  );
}
