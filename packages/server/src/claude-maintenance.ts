import type { ClaudeSubagentRegistry } from "@token-floor/adapter-claude";
import {
  inferTimedOutCompletions,
  pruneCompletedAgents,
  type NormalizedEvent,
  type OfficeState
} from "@token-floor/protocol";
import { recoverClaudeProjectTranscripts } from "./claude-transcript-source.js";

interface ClaudeMaintenanceOptions {
  getState: () => OfficeState;
  setState: (state: OfficeState) => void;
  registry: ClaudeSubagentRegistry;
  projectsPath?: string | undefined;
  acceptRecoveredEvent: (event: NormalizedEvent) => void;
  broadcastSnapshot: (state: OfficeState) => void;
}

/** Owns background recovery and expiry work for Claude without coupling it to HTTP routing. */
export function startClaudeMaintenance(options: ClaudeMaintenanceOptions): () => void {
  const completeInactiveAgents = () => {
    const state = options.getState();
    const next = pruneCompletedAgents(inferTimedOutCompletions(state, new Date()), new Date());
    if (next === state) return;
    for (const [id, agent] of Object.entries(next.agents)) {
      const previous = state.agents[id];
      if (
        previous?.status === "active" &&
        agent.status === "completed" &&
        agent.kind === "subagent" &&
        agent.executionId
      ) {
        options.registry.release(agent.sessionId, agent.executionId);
      }
    }
    options.setState(next);
    options.broadcastSnapshot(next);
  };
  const recoverTranscripts = () => {
    if (!options.projectsPath) return;
    const state = options.getState();
    for (const event of recoverClaudeProjectTranscripts(options.projectsPath)) {
      // Transcript recovery may include helper sessions; only enrich actors first admitted by a
      // meaningful lifecycle hook.
      if (!state.agents[event.agent.id]) continue;
      options.acceptRecoveredEvent(event);
    }
  };
  recoverTranscripts();
  const completionTimer = setInterval(completeInactiveAgents, 15_000);
  const transcriptTimer = options.projectsPath
    ? setInterval(recoverTranscripts, 30_000)
    : undefined;
  return () => {
    clearInterval(completionTimer);
    if (transcriptTimer) clearInterval(transcriptTimer);
  };
}
