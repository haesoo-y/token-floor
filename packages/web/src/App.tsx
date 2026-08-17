import { useEffect, useMemo, useState } from "react";
import { CharacterPicker } from "./components/CharacterPicker.js";
import { ChatPanel } from "./components/ChatPanel.js";
import { ClaudeIntegrationButton } from "./components/ClaudeIntegrationButton.js";
import { HeaderStats } from "./components/HeaderStats.js";
import { OfficeCanvas } from "./components/OfficeCanvas.js";
import { SetupScreen } from "./components/SetupScreen.js";
import { UsageCards } from "./components/UsageCards.js";
import { useAgentStream } from "./hooks/useAgentStream.js";
import { useAssetAvailability } from "./hooks/useAssetAvailability.js";
import { resolveAvatarPreset, type AvatarPreset } from "./lib/avatar.js";
import { translate, type Locale } from "./lib/i18n.js";
import { countAgentStatuses } from "./lib/stats.js";

export function App() {
  const assets = useAssetAvailability();
  const { state, events, connection } = useAgentStream();
  const [selectedId, setSelectedId] = useState<string>();
  const [selectedUsage, setSelectedUsage] = useState<"codex" | "claude-code">();
  const [locale, setLocale] = useState<Locale>(
    () => (localStorage.getItem("token-floor-locale") as Locale | null) ?? "en"
  );
  const [preset, setPreset] = useState<AvatarPreset>(() =>
    resolveAvatarPreset(localStorage.getItem("token-floor-avatar"))
  );
  const stats = useMemo(() => countAgentStatuses(state.agents), [state.agents]);
  const selected = selectedId ? state.agents[selectedId] : undefined;

  useEffect(() => localStorage.setItem("token-floor-locale", locale), [locale]);
  useEffect(() => localStorage.setItem("token-floor-avatar", preset), [preset]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="wordmark">
          <span>TF</span>
          <div>
            <strong>TOKEN FLOOR</strong>
            <small>AGENT OFFICE / LOCAL</small>
          </div>
        </div>
        <HeaderStats stats={stats} locale={locale} />
        <div className="top-actions">
          <ClaudeIntegrationButton locale={locale} />
          <UsageCards
            usage={state.usageByProvider}
            locale={locale}
            onSelect={(provider) => {
              setSelectedId(undefined);
              setSelectedUsage(provider);
            }}
          />
          <select
            value={locale}
            onChange={(event) => setLocale(event.target.value as Locale)}
            aria-label="Language"
          >
            <option value="en">EN</option>
            <option value="ko">KO</option>
            <option value="ja">JA</option>
          </select>
        </div>
      </header>
      <section className="stage">
        <div className="stage-label">
          <span className={`live-dot ${connection}`} />
          {translate(locale, connection === "connected" ? "connected" : "disconnected")}
        </div>
        {assets.status === "ready" ? (
          <OfficeCanvas
            agents={state.agents}
            usage={state.usageByProvider}
            preset={preset}
            locale={locale}
            onSelect={(id) => {
              setSelectedUsage(undefined);
              setSelectedId(id);
            }}
            onSelectUsage={(provider) => {
              setSelectedId(undefined);
              setSelectedUsage(provider);
            }}
          />
        ) : assets.status === "missing" ? (
          <SetupScreen files={assets.files} locale={locale} />
        ) : (
          <div className="loading">CHECKING OFFICE ASSETS…</div>
        )}
        <div className="control-hint">{translate(locale, "controls")}</div>
        <CharacterPicker preset={preset} onChange={setPreset} locale={locale} />
        <ChatPanel
          selected={selected}
          selectedUsage={selectedUsage}
          usage={selectedUsage ? state.usageByProvider[selectedUsage] : undefined}
          events={events}
          locale={locale}
        />
      </section>
    </main>
  );
}
