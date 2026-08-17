import { ClaudeSubagentRegistry, normalizeClaudeHook } from "@token-floor/adapter-claude";
import { applyEvent, type AgentEvent, type OfficeState } from "@token-floor/protocol";

export interface ClaudeIngestionResult {
  state: OfficeState;
  event?: AgentEvent;
}

/** Applies one Claude hook while keeping transport concerns outside the provider adapter. */
export function ingestClaudeHook(
  state: OfficeState,
  payload: unknown,
  now = new Date(),
  registry = new ClaudeSubagentRegistry()
): ClaudeIngestionResult {
  const event = normalizeClaudeHook(payload, now, registry);
  if (
    event &&
    (event.type === "agent.completed" || event.type === "agent.failed") &&
    state.agents[event.agent.id] === undefined
  ) {
    return { state };
  }
  return event ? { state: applyEvent(state, event), event } : { state };
}
