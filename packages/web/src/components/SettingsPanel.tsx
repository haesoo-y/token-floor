import type { ProviderSourceCondition, ProviderSourceSnapshot } from "@token-floor/protocol";
import { framesForPlayer, playerPresets, type AvatarPreset } from "../lib/avatar.js";
import { translate, type Locale, type MessageKey } from "../lib/i18n.js";
import { AvatarPreview } from "./common/AvatarPreview.js";

const statusKeys: Record<ProviderSourceCondition, MessageKey> = {
  healthy: "sourceHealthy",
  waiting: "sourceWaiting",
  missing: "sourceMissing",
  stale: "sourceStale",
  malformed: "sourceMalformed",
  disconnected: "sourceDisconnected"
};

function capabilitySummary(source: ProviderSourceSnapshot | undefined): string {
  if (!source) return "lifecycle · subagents · recovery · usage";
  const capabilities = source.capabilities;
  return [
    capabilities.lifecycle ? "lifecycle" : undefined,
    capabilities.subagents ? "subagents" : undefined,
    capabilities.transcriptRecovery ? "recovery" : undefined,
    `usage:${capabilities.usage}`
  ]
    .filter(Boolean)
    .join(" · ");
}

export function SettingsPanel({
  open,
  locale,
  preset,
  sources,
  onLocaleChange,
  onPresetChange,
  onClose
}: {
  open: boolean;
  locale: Locale;
  preset: AvatarPreset;
  sources: Record<string, ProviderSourceSnapshot>;
  onLocaleChange: (locale: Locale) => void;
  onPresetChange: (preset: AvatarPreset) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <aside className="settings-panel" aria-label={translate(locale, "settings")}>
      <header>
        <strong>{translate(locale, "settings")}</strong>
        <button type="button" onClick={onClose} aria-label="Close settings">
          ×
        </button>
      </header>
      <label>
        Language
        <select value={locale} onChange={(event) => onLocaleChange(event.target.value as Locale)}>
          <option value="en">English</option>
          <option value="ko">한국어</option>
          <option value="ja">日本語</option>
        </select>
      </label>
      <div className="settings-avatars">
        <span>{translate(locale, "player")}</span>
        <div>
          {playerPresets.map((value) => (
            <button
              type="button"
              key={value}
              className={preset === value ? "selected" : ""}
              onClick={() => onPresetChange(value)}
              aria-label={`${value} avatar`}
            >
              <AvatarPreview frames={framesForPlayer(value)} />
            </button>
          ))}
        </div>
      </div>
      <section>
        <h3>{translate(locale, "providerStatus")}</h3>
        {(["codex", "claude-code"] as const).map((provider) => {
          const source = sources[provider];
          const condition = source?.condition ?? "waiting";
          return (
            <article className={`source-status ${condition}`} key={provider}>
              <span className={`provider-dot ${provider}`} />
              <div>
                <strong>{provider === "codex" ? "Codex" : "Claude Code"}</strong>
                <small>{translate(locale, statusKeys[condition])}</small>
                <p>
                  {translate(locale, "capabilities")}: {capabilitySummary(source)}
                </p>
              </div>
            </article>
          );
        })}
      </section>
    </aside>
  );
}
