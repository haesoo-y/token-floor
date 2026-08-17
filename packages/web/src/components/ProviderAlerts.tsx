import type { ProviderSourceCondition, ProviderSourceSnapshot } from "@token-floor/protocol";
import { translate, type Locale, type MessageKey } from "../lib/i18n.js";

const statusKeys: Record<ProviderSourceCondition, MessageKey> = {
  healthy: "sourceHealthy",
  waiting: "sourceWaiting",
  missing: "sourceMissing",
  stale: "sourceStale",
  malformed: "sourceMalformed",
  disconnected: "sourceDisconnected"
};

export function ProviderAlerts({
  sources,
  locale
}: {
  sources: Record<string, ProviderSourceSnapshot>;
  locale: Locale;
}) {
  const alerts = (["codex", "claude-code"] as const)
    .map((provider) => ({ provider, source: sources[provider] }))
    .filter(({ source }) => source && source.condition !== "healthy");
  if (alerts.length === 0) return null;
  return (
    <div className="provider-alerts" aria-live="polite">
      {alerts.map(({ provider, source }) => (
        <div className={`provider-alert ${source!.condition}`} key={provider}>
          <span className={`provider-dot ${provider}`} />
          <strong>{provider === "codex" ? "Codex" : "Claude"}</strong>
          <span>{translate(locale, statusKeys[source!.condition])}</span>
        </div>
      ))}
    </div>
  );
}
