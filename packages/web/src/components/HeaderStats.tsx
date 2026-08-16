import type { AgentStats } from "../lib/stats.js";
import { translate, type Locale } from "../lib/i18n.js";

export function HeaderStats({ stats, locale }: { stats: AgentStats; locale: Locale }) {
  const entries = ["active", "waiting", "completed", "error"] as const;
  return (
    <div className="status-strip" aria-label="Agent status summary">
      {entries.map((status) => (
        <div className={`status-stat status-${status}`} key={status}>
          <span>{translate(locale, status)}</span>
          <strong>{stats[status]}</strong>
        </div>
      ))}
    </div>
  );
}
