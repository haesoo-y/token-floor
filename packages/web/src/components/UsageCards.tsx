import type { UsageSnapshot } from "@token-floor/protocol";
import { translate, type Locale } from "../lib/i18n.js";
import { framesForUsage } from "../lib/avatar.js";
import { AvatarPreview } from "./common/AvatarPreview.js";

function UsageCard({
  provider,
  usage,
  locale,
  onSelect
}: {
  provider: string;
  usage: UsageSnapshot | undefined;
  locale: Locale;
  onSelect: (provider: "codex" | "claude-code") => void;
}) {
  const available = usage?.capability === "weekly-percentage";
  const label = provider === "claude-code" ? "Claude" : "Codex";
  return (
    <button
      className={`usage-card ${provider}`}
      title={usage?.unavailableReason ?? label}
      onClick={() => onSelect(provider as "codex" | "claude-code")}
    >
      <AvatarPreview frames={framesForUsage(provider)} />
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
  locale,
  onSelect
}: {
  usage: Record<string, UsageSnapshot>;
  locale: Locale;
  onSelect: (provider: "codex" | "claude-code") => void;
}) {
  return (
    <div className="usage-list">
      <UsageCard provider="codex" usage={usage.codex} locale={locale} onSelect={onSelect} />
      <UsageCard
        provider="claude-code"
        usage={usage["claude-code"]}
        locale={locale}
        onSelect={onSelect}
      />
    </div>
  );
}
