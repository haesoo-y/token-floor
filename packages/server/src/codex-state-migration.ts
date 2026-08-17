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
