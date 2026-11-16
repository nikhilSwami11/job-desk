export type IconName = "jobs" | "mail" | "tasks" | "reels" | "back" | "tick";

/** One hidden sprite, rendered once; <Icon> points at it. */
export function Sprite() {
  return (
    <svg className="sprite" aria-hidden="true">
      <symbol id="i-jobs" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /><path d="M3 13h18" /></symbol>
      <symbol id="i-mail" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></symbol>
      <symbol id="i-tasks" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 12l3 3 5-6" /></symbol>
      <symbol id="i-reels" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M10 9.5v5l4.5-2.5z" /></symbol>
      <symbol id="i-back" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" /></symbol>
      <symbol id="i-tick" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7" /></symbol>
    </svg>
  );
}

export function Icon({ name }: { name: IconName }) {
  return <svg className="i" aria-hidden="true"><use href={`#i-${name}`} /></svg>;
}
