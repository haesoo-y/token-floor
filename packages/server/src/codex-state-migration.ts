import type { OfficeState } from "@token-floor/protocol";

/** Removes Phase 01 simulated Codex actors while retaining real execution-backed projections. */
export function removeLegacyCodexAgents(state: OfficeState): OfficeState {
  const agents = Object.fromEntries(
    Object.entries(state.agents).filter(
      ([, agent]) =>
        agent.provider !== "codex" ||
        (agent.id.startsWith("codex:") && agent.executionId !== undefined)
    )
  );
  return Object.keys(agents).length === Object.keys(state.agents).length
    ? state
    : { ...state, agents };
}

/** Removes provider-internal Codex actors and their visible projection history. */
export function removeHiddenCodexAgents(
  state: OfficeState,
  hiddenAgentIds: ReadonlySet<string>
): OfficeState {
  if (hiddenAgentIds.size === 0) return state;
  const agents = Object.fromEntries(
    Object.entries(state.agents).filter(([id]) => !hiddenAgentIds.has(id))
  );
  const messages = state.messages.filter((event) => !hiddenAgentIds.has(event.agent.id));
  const recentEvents = state.recentEvents.filter(
    (event) => event.type === "usage.updated" || !hiddenAgentIds.has(event.agent.id)
  );
  if (
    Object.keys(agents).length === Object.keys(state.agents).length &&
    messages.length === state.messages.length &&
    recentEvents.length === state.recentEvents.length
  )
    return state;
  return { ...state, agents, messages, recentEvents };
}
