import type { NormalizedEvent } from "@token-floor/protocol";
import { CodexSessionCollector } from "./codex-session-source.js";

interface CodexMaintenanceOptions {
  sessionsPath?: string | undefined;
  acceptEvent: (event: NormalizedEvent) => void;
  intervalMs?: number;
}

/** Owns bounded Codex session polling independently from usage and Claude collectors. */
export function startCodexMaintenance(options: CodexMaintenanceOptions): () => void {
  if (!options.sessionsPath) return () => undefined;
  const collector = new CodexSessionCollector(options.sessionsPath);
  const refresh = () => {
    for (const event of collector.poll()) options.acceptEvent(event);
  };
  refresh();
  const timer = setInterval(refresh, options.intervalMs ?? 1_000);
  return () => clearInterval(timer);
}
