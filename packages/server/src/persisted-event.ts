import { sanitizeSpeech, type NormalizedEvent } from "@token-floor/protocol";

function agentBase(event: Exclude<NormalizedEvent, { type: "usage.updated" }>) {
  return {
    schemaVersion: event.schemaVersion,
    eventId: event.eventId,
    occurredAt: event.occurredAt,
    provider: event.provider,
    sessionId: event.sessionId,
    agent: {
      id: event.agent.id,
      kind: event.agent.kind,
      ...(event.agent.parentId ? { parentId: event.agent.parentId } : {}),
      ...(event.agent.executionId ? { executionId: event.agent.executionId } : {}),
      ...(event.agent.role ? { role: sanitizeSpeech(event.agent.role, { maxLength: 64 }) } : {})
    },
    project: {
      id: event.project.id,
      label: sanitizeSpeech(event.project.label, { maxLength: 96 })
    }
  };
}

/** Creates an allowlisted, credential-redacted event for durable local storage. */
export function persistedEvent(event: NormalizedEvent): NormalizedEvent {
  if (event.type === "usage.updated") {
    return {
      schemaVersion: event.schemaVersion,
      eventId: event.eventId,
      occurredAt: event.occurredAt,
      provider: event.provider,
      sessionId: event.sessionId,
      type: event.type,
      usage: {
        capability: event.usage.capability,
        ...(event.usage.remainingPercent !== undefined
          ? { remainingPercent: event.usage.remainingPercent }
          : {}),
        ...(event.usage.fiveHourRemainingPercent !== undefined
          ? { fiveHourRemainingPercent: event.usage.fiveHourRemainingPercent }
          : {}),
        ...(event.usage.resetsAt ? { resetsAt: event.usage.resetsAt } : {}),
        ...(event.usage.unavailableReason
          ? {
              unavailableReason: sanitizeSpeech(event.usage.unavailableReason, { maxLength: 96 })
            }
          : {})
      }
    };
  }
  const base = agentBase(event);
  if (event.type === "agent.started") return { ...base, type: event.type };
  if (event.type === "agent.active") {
    return {
      ...base,
      type: event.type,
      activity: {
        ...(event.activity.tool
          ? { tool: sanitizeSpeech(event.activity.tool, { maxLength: 64 }) }
          : {}),
        ...(event.activity.summary
          ? { summary: sanitizeSpeech(event.activity.summary, { maxLength: 96 }) }
          : {})
      }
    };
  }
  if (event.type === "agent.message") {
    return {
      ...base,
      type: event.type,
      message: {
        role: event.message.role,
        text: sanitizeSpeech(event.message.text, { maxLength: 200 })
      }
    };
  }
  if (event.type === "agent.waiting") return { ...base, type: event.type, reason: event.reason };
  if (event.type === "agent.completed") {
    return { ...base, type: event.type, inferred: event.inferred };
  }
  return {
    ...base,
    type: event.type,
    error: {
      ...(event.error.code ? { code: sanitizeSpeech(event.error.code, { maxLength: 64 }) } : {}),
      message: sanitizeSpeech(event.error.message, { maxLength: 200 })
    }
  };
}
