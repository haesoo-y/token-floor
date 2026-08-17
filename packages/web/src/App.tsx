import { useEffect, useMemo, useState } from "react";
import { CharacterPicker } from "./components/CharacterPicker.js";
import { ChatPanel, type PanelTab } from "./components/ChatPanel.js";
import { HeaderStats } from "./components/HeaderStats.js";
import { MemoPanel } from "./components/MemoPanel.js";
import { OfficeCanvas } from "./components/OfficeCanvas.js";
import { SetupScreen } from "./components/SetupScreen.js";
import { SettingsPanel } from "./components/SettingsPanel.js";
import { ProviderAlerts } from "./components/ProviderAlerts.js";
import { UsageCards } from "./components/UsageCards.js";
import { useAgentStream } from "./hooks/useAgentStream.js";
import { useMemos } from "./hooks/useMemos.js";
import { useAssetAvailability } from "./hooks/useAssetAvailability.js";
import { resolveAvatarPreset, type AvatarPreset } from "./lib/avatar.js";
import { resolveLocale, translate, type Locale } from "./lib/i18n.js";
import { countAgentStatuses } from "./lib/stats.js";
import { nextMemoPanelOpenState } from "./game/officeInteraction.js";

export function App() {
  const assets = useAssetAvailability();
  const { state, events, connection } = useAgentStream();
  const memoState = useMemos();
  const [selectedId, setSelectedId] = useState<string>();
  const [selectedUsage, setSelectedUsage] = useState<"codex" | "claude-code">();
  const [panelTab, setPanelTab] = useState<PanelTab>("selected");
  const [panelMinimized, setPanelMinimized] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [memosOpen, setMemosOpen] = useState(false);
  const [locale, setLocale] = useState<Locale>(() =>
    resolveLocale(localStorage.getItem("token-floor-locale"))
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
          <div>
            <strong>TOKEN FLOOR</strong>
            <small>AGENT OFFICE / LOCAL</small>
          </div>
        </div>
        <HeaderStats stats={stats} locale={locale} />
        <div className="top-actions">
          <UsageCards
            usage={state.usageByProvider}
            locale={locale}
            onSelect={(provider) => {
              setSelectedId(undefined);
              setSelectedUsage(provider);
              setPanelTab("selected");
              setPanelMinimized(false);
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
          <button
            type="button"
            className="settings-toggle"
            onClick={() => setSettingsOpen((open) => !open)}
            aria-label={translate(locale, "settings")}
          >
            ⚙
          </button>
        </div>
      </header>
      <section className="stage">
        <div className="stage-label">
          <span className={`live-dot ${connection}`} />
          {translate(
            locale,
            connection === "connected"
              ? "connected"
              : connection === "connecting"
                ? "connecting"
                : "disconnected"
          )}
        </div>
        <ProviderAlerts sources={state.sourceStatusByProvider ?? {}} locale={locale} />
        {assets.status === "ready" ? (
          <OfficeCanvas
            agents={state.agents}
            preset={preset}
            locale={locale}
            onSelect={(id) => {
              setSelectedUsage(undefined);
              setSelectedId(id);
              setPanelTab("selected");
              setPanelMinimized(false);
            }}
            onSelectUsage={(provider) => {
              setSelectedId(undefined);
              setSelectedUsage(provider);
              setPanelTab("selected");
              setPanelMinimized(false);
            }}
            onOpenMemos={() => setMemosOpen(nextMemoPanelOpenState)}
          />
        ) : assets.status === "missing" ? (
          <SetupScreen files={assets.files} locale={locale} />
        ) : (
          <div className="loading">CHECKING OFFICE ASSETS…</div>
        )}
        <CharacterPicker preset={preset} onChange={setPreset} locale={locale} />
        <SettingsPanel
          open={settingsOpen}
          locale={locale}
          preset={preset}
          sources={state.sourceStatusByProvider ?? {}}
          onLocaleChange={setLocale}
          onPresetChange={setPreset}
          onClose={() => setSettingsOpen(false)}
        />
        <ChatPanel
          selected={selected}
          selectedUsage={selectedUsage}
          usage={selectedUsage ? state.usageByProvider[selectedUsage] : undefined}
          messages={state.messages ?? []}
          events={events}
          locale={locale}
          activeTab={panelTab}
          minimized={panelMinimized}
          onTabChange={setPanelTab}
          onMinimizedChange={setPanelMinimized}
        />
        <MemoPanel
          open={memosOpen}
          memos={memoState.memos}
          loading={memoState.loading}
          error={memoState.error}
          locale={locale}
          onClose={() => setMemosOpen(false)}
          onRefresh={memoState.refresh}
          onCreate={memoState.createMemo}
          onUpdate={memoState.updateMemo}
          onDelete={memoState.deleteMemo}
        />
      </section>
    </main>
  );
}
