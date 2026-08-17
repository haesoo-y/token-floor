import type {
  AgentMessageEvent,
  AgentSnapshot,
  NormalizedEvent,
  UsageSnapshot
} from "@token-floor/protocol";
import { translate, type Locale } from "../lib/i18n.js";
import { truncateChatText } from "../lib/chatText.js";
import { usageDetailValues } from "../lib/usageDetails.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/Tabs.js";

export type PanelTab = "selected" | "chat" | "events";

export function ChatPanel({
  selected,
  selectedUsage,
  usage,
  messages,
  events,
  locale,
  activeTab,
  minimized,
  onTabChange,
  onMinimizedChange
}: {
  selected: AgentSnapshot | undefined;
  selectedUsage: "codex" | "claude-code" | undefined;
  usage: UsageSnapshot | undefined;
  messages: AgentMessageEvent[];
  events: NormalizedEvent[];
  locale: Locale;
  activeTab: PanelTab;
  minimized: boolean;
  onTabChange: (tab: PanelTab) => void;
  onMinimizedChange: (minimized: boolean) => void;
}) {
  const usageValues = usageDetailValues(usage, locale, translate(locale, "tokenUnavailable"));
  if (minimized) {
    return (
      <aside className="chat-panel is-minimized">
        <strong>{translate(locale, "activityPanel")}</strong>
        <button
          type="button"
          className="panel-toggle"
          aria-label={translate(locale, "restorePanel")}
          title={translate(locale, "restorePanel")}
          onClick={() => onMinimizedChange(false)}
        >
          ↗
        </button>
      </aside>
    );
  }
  return (
    <aside className="chat-panel">
      <Tabs
        value={activeTab}
        onValueChange={(value) => onTabChange(value as PanelTab)}
        className="panel-tabs"
      >
        <div className="panel-toolbar">
          <TabsList>
            <TabsTrigger value="selected">{translate(locale, "selectedAgent")}</TabsTrigger>
            <TabsTrigger value="chat">{translate(locale, "chatLog")}</TabsTrigger>
            <TabsTrigger value="events">{translate(locale, "allEvents")}</TabsTrigger>
          </TabsList>
          <button
            type="button"
            className="panel-toggle"
            aria-label={translate(locale, "minimizePanel")}
            title={translate(locale, "minimizePanel")}
            onClick={() => onMinimizedChange(true)}
          >
            −
          </button>
        </div>
        <TabsContent value="selected" className="panel-content">
          {selected ? (
            <>
              <div className="agent-heading">
                <span className={`provider-dot ${selected.provider}`} />
                <div>
                  <strong>{selected.id}</strong>
                  <small>
                    {selected.provider} · {selected.status}
                  </small>
                </div>
              </div>
              <dl>
                <div>
                  <dt>Project</dt>
                  <dd>{selected.projectLabel}</dd>
                </div>
                <div>
                  <dt>Session</dt>
                  <dd>{selected.sessionId}</dd>
                </div>
                <div>
                  <dt>Activity</dt>
                  <dd>{selected.activity?.summary ?? selected.waitReason ?? "—"}</dd>
                </div>
                <div>
                  <dt>Parent</dt>
                  <dd>{selected.parentId ?? "—"}</dd>
                </div>
              </dl>
            </>
          ) : selectedUsage ? (
            <>
              <div className="agent-heading">
                <span className={`provider-dot ${selectedUsage}`} />
                <div>
                  <strong>{selectedUsage === "codex" ? "Codex" : "Claude Code"}</strong>
                  <small>{translate(locale, "usageDetails")}</small>
                </div>
              </div>
              <dl>
                <div>
                  <dt>{translate(locale, "weeklyLeft")}</dt>
                  <dd>{usageValues.weekly}</dd>
                </div>
                <div>
                  <dt>{translate(locale, "fiveHourLeft")}</dt>
                  <dd>{usageValues.fiveHour}</dd>
                </div>
                <div>
                  <dt>{translate(locale, "lastSyncedAt")}</dt>
                  <dd>{usageValues.lastSyncedAt}</dd>
                </div>
                <div>
                  <dt>{translate(locale, "resetsAt")}</dt>
                  <dd>{usageValues.resetsAt}</dd>
                </div>
              </dl>
            </>
          ) : (
            <p className="empty">{translate(locale, "noSelection")}</p>
          )}
        </TabsContent>
        <TabsContent value="chat" className="panel-content chat-log">
          {messages.length === 0 ? (
            <p className="empty">Waiting for the next message…</p>
          ) : (
            messages.map((event) => (
              <article
                className={`chat-row ${event.message.role} ${event.provider}`}
                key={event.eventId}
              >
                <header>
                  <strong>{event.message.role === "assistant" ? event.agent.id : "User"}</strong>
                  <time>{new Date(event.occurredAt).toLocaleTimeString()}</time>
                </header>
                <p>{truncateChatText(event.message.text, 200)}</p>
              </article>
            ))
          )}
        </TabsContent>
        <TabsContent value="events" className="panel-content event-list">
          {events.length === 0 ? (
            <p className="empty">Waiting for the next event…</p>
          ) : (
            events.map((event) => (
              <div className={`event-row ${event.provider}`} key={event.eventId}>
                <time>{new Date(event.occurredAt).toLocaleTimeString()}</time>
                <span>{event.provider}</span>
                <strong>{event.type}</strong>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </aside>
  );
}
