import type { AgentSnapshot, OfficeState } from "./state.js";

export const DEFAULT_COMPLETION_TIMEOUT_MS = 3 * 60 * 1000;
export const DEFAULT_COMPLETED_RETENTION_MS = 60 * 60 * 1000;

/** Marks silent active agents completed while preserving waiting and error projections. */
export function inferTimedOutCompletions(
  state: OfficeState,
  now: Date,
  timeoutMs = DEFAULT_COMPLETION_TIMEOUT_MS
): OfficeState {
  let changed = false;
  const agents: Record<string, AgentSnapshot> = { ...state.agents };
  for (const [id, agent] of Object.entries(state.agents)) {
    if (agent.status !== "active" || now.getTime() - Date.parse(agent.lastEventAt) < timeoutMs) {
      continue;
    }
    changed = true;
    const completedAt = new Date(Date.parse(agent.lastEventAt) + timeoutMs).toISOString();
    agents[id] = {
      ...agent,
      status: "completed",
      inferredCompletion: true,
      completedAt,
      lastEventAt: completedAt,
      lastEventType: "agent.completed"
    };
  }
  return changed ? { ...state, agents } : state;
}

/** Removes only completed character projections after the retention boundary. */
export function pruneCompletedAgents(
  state: OfficeState,
  now: Date,
  retentionMs = DEFAULT_COMPLETED_RETENTION_MS
): OfficeState {
  const agents = Object.fromEntries(
    Object.entries(state.agents).filter(
      ([, agent]) =>
        agent.status !== "completed" ||
        now.getTime() - Date.parse(agent.completedAt ?? agent.lastEventAt) < retentionMs
    )
  );
  return Object.keys(agents).length === Object.keys(state.agents).length
    ? state
    : { ...state, agents };
}
