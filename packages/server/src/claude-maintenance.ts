import type { NormalizedEvent, OfficeState } from "@token-floor/protocol";
import { recoverClaudeProjectTranscriptsWithDiagnostics } from "./claude-transcript-source.js";
import { emptyCollectorReport, type ProviderCollectorReport } from "./source-diagnostics.js";

interface ClaudeMaintenanceOptions {
  getState: () => OfficeState;
  projectsPath?: string | undefined;
  acceptRecoveredEvent: (event: NormalizedEvent) => void;
  reportStatus?: (report: ProviderCollectorReport) => void;
}

/** Owns background recovery and expiry work for Claude without coupling it to HTTP routing. */
export function startClaudeMaintenance(options: ClaudeMaintenanceOptions): () => void {
  const recoverTranscripts = () => {
    if (!options.projectsPath) {
      options.reportStatus?.(emptyCollectorReport(undefined));
      return;
    }
    const state = options.getState();
    const result = recoverClaudeProjectTranscriptsWithDiagnostics(options.projectsPath);
    options.reportStatus?.(result.report);
    for (const event of result.events) {
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
