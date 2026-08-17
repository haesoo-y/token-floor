import type { NormalizedEvent, OfficeState } from "@token-floor/protocol";

/** Hides legacy and no-work Claude sessions while preserving immutable event history. */
export function removeUnobservedClaudeAgents(
  state: OfficeState,
  events: readonly NormalizedEvent[]
): OfficeState {
  const observed = new Set(
    events.flatMap((event) => {
      if (event.type === "usage.updated" || event.provider !== "claude-code") return [];
      const meaningful =
        event.type === "agent.active" ||
        event.type === "agent.waiting" ||
        event.type === "agent.failed" ||
        (event.agent.kind === "subagent" && event.type === "agent.started");
      return meaningful ? [event.agent.id] : [];
    })
  );
  const agents = Object.fromEntries(
    Object.entries(state.agents).filter(
      ([id, agent]) =>
        agent.provider !== "claude-code" ||
        (observed.has(id) && (agent.kind !== "subagent" || agent.executionId !== undefined))
    )
  );
  return Object.keys(agents).length === Object.keys(state.agents).length
    ? state
    : { ...state, agents };
}
