import { useState } from "react";
import type { AgentSnapshot, NormalizedEvent } from "@token-floor/protocol";
import { translate, type Locale } from "../lib/i18n.js";

export function ChatPanel({
  selected,
  events,
  locale
}: {
  selected: AgentSnapshot | undefined;
  events: NormalizedEvent[];
  locale: Locale;
}) {
  const [tab, setTab] = useState<"selected" | "events">("selected");
  return (
    <aside className="chat-panel">
      <div className="panel-tabs">
        <button className={tab === "selected" ? "active" : ""} onClick={() => setTab("selected")}>
          {translate(locale, "selectedAgent")}
        </button>
        <button className={tab === "events" ? "active" : ""} onClick={() => setTab("events")}>
          {translate(locale, "allEvents")}
        </button>
      </div>
      {tab === "selected" ? (
        <div className="panel-content">
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
          ) : (
            <p className="empty">{translate(locale, "noSelection")}</p>
          )}
        </div>
      ) : (
        <div className="panel-content event-list">
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
        </div>
      )}
    </aside>
  );
}
