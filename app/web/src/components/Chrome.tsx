import type { View } from "../types";
import { Icon, type IconName } from "./Icon";

const TABS: { view: View; label: string; icon: IconName }[] = [
  { view: "jobs", label: "Jobs", icon: "jobs" },
  { view: "mail", label: "Mail", icon: "mail" },
  { view: "tasks", label: "Tasks", icon: "tasks" },
  { view: "reels", label: "Reels", icon: "reels" },
];

/** Bottom tab bar on a phone, left rail on a laptop (CSS decides). */
export function Nav({ view, badge }: { view: View; badge: number }) {
  return (
    <nav className="nav" aria-label="Sections">
      {TABS.map(t => (
        <a key={t.view} href={`#${t.view}`} aria-current={t.view === view ? "page" : "false"}>
          <Icon name={t.icon} />
          <span className="lab">{t.label}</span>
          {t.view === "jobs" && badge > 0 && <span className="badge">{badge}</span>}
        </a>
      ))}
    </nav>
  );
}

export function TopBand({ title, showBack, onBack }: { title: string; showBack: boolean; onBack: () => void }) {
  return (
    <header className="topband">
      {showBack && <button className="back" type="button" onClick={onBack}><Icon name="back" />Jobs</button>}
      <span className="ttl">{title}</span>
    </header>
  );
}
