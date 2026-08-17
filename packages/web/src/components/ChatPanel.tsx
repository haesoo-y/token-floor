import type { AgentSnapshot, NormalizedEvent, UsageSnapshot } from "@token-floor/protocol";
import { translate, type Locale } from "../lib/i18n.js";
import { usageDetailValues } from "../lib/usageDetails.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/Tabs.js";

export function ChatPanel({
  selected,
  selectedUsage,
  usage,
  events,
  locale
}: {
  selected: AgentSnapshot | undefined;
  selectedUsage: "codex" | "claude-code" | undefined;
  usage: UsageSnapshot | undefined;
  events: NormalizedEvent[];
  locale: Locale;
}) {
  const usageValues = usageDetailValues(usage, locale, translate(locale, "tokenUnavailable"));
  return (
    <aside className="chat-panel">
      <Tabs defaultValue="selected">
        <TabsList>
          <TabsTrigger value="selected">{translate(locale, "selectedAgent")}</TabsTrigger>
          <TabsTrigger value="events">{translate(locale, "allEvents")}</TabsTrigger>
        </TabsList>
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
                  <dt>{translate(locale, "resetsAt")}</dt>
                  <dd>{usageValues.resetsAt}</dd>
                </div>
                <div>
                  <dt>{translate(locale, "checkedAt")}</dt>
                  <dd>{usageValues.checkedAt}</dd>
                </div>
                <div>
                  <dt>{translate(locale, "reason")}</dt>
                  <dd>{usageValues.reason}</dd>
                </div>
              </dl>
            </>
          ) : (
            <p className="empty">{translate(locale, "noSelection")}</p>
          )}
        </TabsContent>
        <TabsContent value="events" className="panel-content event-list">
          {events.length === 0 ? (
            <p className="empty">Waiting for the next event…</p>
          ) : (
            events.map((event) => (
              <div className="event-row" key={event.eventId}>
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
