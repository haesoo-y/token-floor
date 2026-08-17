import type { OfficeState } from "@token-floor/protocol";
import {
  projectSourceStatus,
  providerCapabilities,
  sourceStatusChanged,
  type ProviderCollectorReport
} from "./source-diagnostics.js";

/** Applies one structural collector report without exposing provider-owned source data. */
export function applyProviderSourceReport(
  state: OfficeState,
  provider: "codex" | "claude-code",
  report: ProviderCollectorReport
): OfficeState {
  const recoveredAt = Object.values(state.agents)
    .filter((agent) => agent.provider === provider)
    .map((agent) => agent.lastEventAt)
    .sort()
    .at(-1);
  const previous =
    state.sourceStatusByProvider[provider] ??
    (recoveredAt
      ? {
          condition: "waiting" as const,
          checkedAt: recoveredAt,
          lastSuccessAt: recoveredAt,
          capabilities: providerCapabilities[provider]
        }
      : undefined);
  const status = projectSourceStatus(provider, report, previous);
  if (!sourceStatusChanged(previous, status)) return state;
  return {
    ...state,
    sourceStatusByProvider: { ...state.sourceStatusByProvider, [provider]: status }
  };
}
