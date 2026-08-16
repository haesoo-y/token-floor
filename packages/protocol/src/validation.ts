import { EVENT_SCHEMA_VERSION, type NormalizedEvent } from "./model.js";

const agentTypes = new Set([
  "agent.started",
  "agent.active",
  "agent.waiting",
  "agent.completed",
  "agent.failed"
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasString(record: Record<string, unknown>, key: string): boolean {
  return typeof record[key] === "string" && record[key].length > 0;
}

function hasBaseFields(value: Record<string, unknown>): boolean {
  return (
    value.schemaVersion === EVENT_SCHEMA_VERSION &&
    hasString(value, "eventId") &&
    hasString(value, "occurredAt") &&
    !Number.isNaN(Date.parse(String(value.occurredAt))) &&
    hasString(value, "provider") &&
    hasString(value, "sessionId") &&
    hasString(value, "type")
  );
}

function hasAgentFields(value: Record<string, unknown>): boolean {
  if (!isRecord(value.agent) || !isRecord(value.project)) return false;
  const agent = value.agent;
  const project = value.project;
  return (
    hasString(agent, "id") &&
    (agent.kind === "main" || agent.kind === "subagent") &&
    (agent.parentId === undefined || typeof agent.parentId === "string") &&
    hasString(project, "id") &&
    hasString(project, "label")
  );
}

function hasTypePayload(value: Record<string, unknown>): boolean {
  if (value.type === "agent.active") return isRecord(value.activity);
  if (value.type === "agent.waiting") {
    return value.reason === "input" || value.reason === "permission";
  }
  if (value.type === "agent.completed") return typeof value.inferred === "boolean";
  if (value.type === "agent.failed") {
    return isRecord(value.error) && hasString(value.error, "message");
  }
  return value.type === "agent.started";
}

function hasUsagePayload(value: Record<string, unknown>): boolean {
  if (!isRecord(value.usage)) return false;
  const usage = value.usage;
  if (usage.capability === "unavailable") return true;
  return (
    usage.capability === "weekly-percentage" &&
    typeof usage.remainingPercent === "number" &&
    usage.remainingPercent >= 0 &&
    usage.remainingPercent <= 100
  );
}

/**
 * Validates untrusted adapter or WebSocket input at the protocol boundary.
 *
 * @throws {Error} When the envelope or type-specific payload violates schema version 1.
 */
export function parseNormalizedEvent(value: unknown): NormalizedEvent {
  if (!isRecord(value) || !hasBaseFields(value)) throw new Error("Invalid event envelope");
  if (value.type === "usage.updated" && hasUsagePayload(value))
    return value as unknown as NormalizedEvent;
  if (agentTypes.has(String(value.type)) && hasAgentFields(value) && hasTypePayload(value)) {
    return value as unknown as NormalizedEvent;
  }
  throw new Error("Invalid event payload");
}
