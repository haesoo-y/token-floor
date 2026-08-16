import { normalizeClaudeHook } from "@token-floor/adapter-claude";
import { applyEvent, type AgentEvent, type OfficeState } from "@token-floor/protocol";

export interface ClaudeIngestionResult {
  state: OfficeState;
  event?: AgentEvent;
}

/** Applies one Claude hook while keeping transport concerns outside the provider adapter. */
export function ingestClaudeHook(
  state: OfficeState,
  payload: unknown,
  now = new Date()
): ClaudeIngestionResult {
  const event = normalizeClaudeHook(payload, now);
  return event ? { state: applyEvent(state, event), event } : { state };
}
