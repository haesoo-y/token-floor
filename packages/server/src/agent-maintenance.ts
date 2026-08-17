import {
  inferTimedOutCompletions,
  pruneCompletedAgents,
  type OfficeState
} from "@token-floor/protocol";

interface AgentMaintenanceOptions {
  getState: () => OfficeState;
  setState: (state: OfficeState) => void;
  broadcastSnapshot: (state: OfficeState) => void;
  onChange?: (previous: OfficeState, next: OfficeState) => void;
  intervalMs?: number;
}

/** Owns provider-neutral inference and retention for all normalized office agents. */
export function startAgentMaintenance(options: AgentMaintenanceOptions): () => void {
  const refresh = () => {
    const previous = options.getState();
    const now = new Date();
    const next = pruneCompletedAgents(inferTimedOutCompletions(previous, now), now);
    if (next === previous) return;
    options.onChange?.(previous, next);
    options.setState(next);
    options.broadcastSnapshot(next);
  };
  refresh();
  const timer = setInterval(refresh, options.intervalMs ?? 15_000);
  return () => clearInterval(timer);
}
