import type { NormalizedEvent, OfficeState } from "@token-floor/protocol";
import { recoverClaudeProjectTranscripts } from "./claude-transcript-source.js";

interface ClaudeMaintenanceOptions {
  getState: () => OfficeState;
  projectsPath?: string | undefined;
  acceptRecoveredEvent: (event: NormalizedEvent) => void;
}

/** Owns background recovery and expiry work for Claude without coupling it to HTTP routing. */
export function startClaudeMaintenance(options: ClaudeMaintenanceOptions): () => void {
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
  const transcriptTimer = options.projectsPath
    ? setInterval(recoverTranscripts, 30_000)
    : undefined;
  return () => {
    if (transcriptTimer) clearInterval(transcriptTimer);
  };
}
