import type { UsageSnapshot } from "@token-floor/protocol";
import { translate, type Locale } from "../lib/i18n.js";

function UsageCard({
  provider,
  usage,
  locale
}: {
  provider: string;
  usage: UsageSnapshot | undefined;
  locale: Locale;
}) {
  const available = usage?.capability === "weekly-percentage";
  const label = provider === "claude-code" ? "Claude" : "Codex";
  return (
    <button className={`usage-card ${provider}`} title={usage?.unavailableReason ?? label}>
      <span className="usage-avatar" aria-hidden="true" />
      <span>
        <small>{label} weekly</small>
        <strong>
          {available ? `${usage.remainingPercent}%` : translate(locale, "tokenUnavailable")}
        </strong>
      </span>
    </button>
  );
}

export function UsageCards({
  usage,
  locale
}: {
  usage: Record<string, UsageSnapshot>;
  locale: Locale;
}) {
  return (
    <div className="usage-list">
      <UsageCard provider="codex" usage={usage.codex} locale={locale} />
      <UsageCard provider="claude-code" usage={usage["claude-code"]} locale={locale} />
    </div>
  );
}
