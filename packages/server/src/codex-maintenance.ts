import type { NormalizedEvent } from "@token-floor/protocol";
import { CodexSessionCollector } from "./codex-session-source.js";
import { emptyCollectorReport, type ProviderCollectorReport } from "./source-diagnostics.js";

interface CodexMaintenanceOptions {
  sessionsPath?: string | undefined;
  acceptEvent: (event: NormalizedEvent) => void;
  excludeAgents?: (agentIds: ReadonlySet<string>) => void;
  intervalMs?: number;
  reportStatus?: (report: ProviderCollectorReport) => void;
}

/** Owns bounded Codex session polling independently from usage and Claude collectors. */
export function startCodexMaintenance(options: CodexMaintenanceOptions): () => void {
  if (!options.sessionsPath) {
    options.reportStatus?.(emptyCollectorReport(undefined));
    return () => undefined;
  }
  const collector = new CodexSessionCollector(options.sessionsPath);
  const refresh = () => {
    for (const event of collector.poll()) options.acceptEvent(event);
    options.excludeAgents?.(collector.hiddenAgentIds());
    options.reportStatus?.(collector.diagnostics());
  };
  refresh();
  const timer = setInterval(refresh, options.intervalMs ?? 1_000);
  return () => clearInterval(timer);
}
