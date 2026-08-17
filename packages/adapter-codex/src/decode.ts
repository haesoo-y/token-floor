import type { CodexRecord } from "./types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(record: Record<string, unknown>, key: string): string | undefined {
  return typeof record[key] === "string" && record[key].length > 0
    ? String(record[key])
    : undefined;
}

function timestamp(value: unknown): string | undefined {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) return undefined;
  return new Date(value).toISOString();
}

function turnId(payload: Record<string, unknown>): string | undefined {
  const direct = text(payload, "turn_id");
  if (direct) return direct;
  const metadata = payload.internal_chat_message_metadata_passthrough;
  return isRecord(metadata) ? text(metadata, "turn_id") : undefined;
}

function waitingReason(payload: Record<string, unknown>): "input" | "permission" | undefined {
  const opaqueInput = [payload.input, payload.arguments]
    .filter((item): item is string => typeof item === "string")
    .join(" ");
  if (opaqueInput.includes("request_user_input")) return "input";
  if (opaqueInput.includes("require_escalated")) return "permission";
  return undefined;
}

function decodeSession(
  payload: Record<string, unknown>,
  outerTimestamp: unknown
): CodexRecord | undefined {
  const threadId = text(payload, "id");
  const cwd = text(payload, "cwd");
  const occurredAt = timestamp(payload.timestamp) ?? timestamp(outerTimestamp);
  if (!threadId || !cwd || !occurredAt) return undefined;
  const source = payload.source;
  const subagentSource =
    isRecord(source) && isRecord(source.subagent) ? source.subagent : undefined;
  const subagentKind = subagentSource ? text(subagentSource, "other") : undefined;
  const parentThreadId = text(payload, "parent_thread_id");
  const forkedFromId = text(payload, "forked_from_id");
  return {
    type: "session",
    timestamp: occurredAt,
    threadId,
    sessionId: text(payload, "session_id") ?? threadId,
    cwd,
    kind: subagentSource ? "subagent" : "main",
    ...(subagentKind ? { subagentKind } : {}),
    ...(parentThreadId ? { parentThreadId } : {}),
    ...(forkedFromId ? { forkedFromId } : {})
  };
}

function decodeHeartbeat(
  payloadType: string | undefined,
  payload: Record<string, unknown>,
  occurredAt: string
): CodexRecord | undefined {
  if (
    payloadType !== "mcp_tool_call_begin" &&
    payloadType !== "mcp_tool_call_end" &&
    payloadType !== "agent_reasoning"
  ) {
    return undefined;
  }
  // Only structural identity crosses the adapter boundary; reasoning and tool payloads stay local.
  const structuralId = text(payload, "call_id") ?? occurredAt;
  return {
    type: "heartbeat",
    timestamp: occurredAt,
    heartbeatId: `${payloadType}:${structuralId}`
  };
}

/** Decodes lifecycle metadata and visible chat text while excluding tool inputs and results. */
export function decodeCodexRecord(value: unknown): CodexRecord | undefined {
  if (!isRecord(value) || !isRecord(value.payload)) return undefined;
  const payload = value.payload;
  if (value.type === "session_meta") return decodeSession(payload, value.timestamp);
  const occurredAt = timestamp(value.timestamp);
  if (!occurredAt) return undefined;
  const payloadType = text(payload, "type");
  if (value.type === "event_msg") {
    const heartbeat = decodeHeartbeat(payloadType, payload, occurredAt);
    if (heartbeat) return heartbeat;
  }
  if (
    value.type === "event_msg" &&
    (payloadType === "user_message" || payloadType === "agent_message")
  ) {
    const message = text(payload, "message");
    return message
      ? {
          type: "message",
          timestamp: occurredAt,
          role: payloadType === "user_message" ? "user" : "assistant",
          text: message
        }
      : undefined;
  }
  if (value.type === "event_msg" && payloadType === "task_started") {
    const id = text(payload, "turn_id");
    return id ? { type: "task.started", timestamp: occurredAt, turnId: id } : undefined;
  }
  if (value.type === "event_msg" && payloadType === "task_complete") {
    const id = text(payload, "turn_id");
    return id ? { type: "task.completed", timestamp: occurredAt, turnId: id } : undefined;
  }
  if (value.type === "event_msg" && (payloadType === "turn_aborted" || payloadType === "error")) {
    const id = text(payload, "turn_id");
    return { type: "task.failed", timestamp: occurredAt, ...(id ? { turnId: id } : {}) };
  }
  if (value.type === "event_msg" && payloadType === "sub_agent_activity") {
    const eventId = text(payload, "event_id");
    const childThreadId = text(payload, "agent_thread_id");
    const kind = text(payload, "kind");
    if (!eventId || !childThreadId || !kind) return undefined;
    if (kind !== "started" && kind !== "interacted" && kind !== "interrupted") return undefined;
    const state = kind === "started" ? "started" : kind === "interacted" ? "active" : "failed";
    return { type: "subagent.activity", timestamp: occurredAt, eventId, childThreadId, state };
  }
  if (
    value.type === "response_item" &&
    (payloadType === "custom_tool_call" || payloadType === "function_call")
  ) {
    const callId = text(payload, "call_id");
    if (!callId) return undefined;
    const reason = waitingReason(payload);
    const id = turnId(payload);
    return reason
      ? { type: "waiting", timestamp: occurredAt, callId, reason, ...(id ? { turnId: id } : {}) }
      : { type: "activity", timestamp: occurredAt, callId, ...(id ? { turnId: id } : {}) };
  }
  if (
    value.type === "response_item" &&
    (payloadType === "custom_tool_call_output" || payloadType === "function_call_output")
  ) {
    const callId = text(payload, "call_id");
    const id = turnId(payload);
    return callId
      ? { type: "activity", timestamp: occurredAt, callId, ...(id ? { turnId: id } : {}) }
      : undefined;
  }
  return undefined;
}
