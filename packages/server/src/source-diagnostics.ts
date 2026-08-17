import fs from "node:fs";
import type {
  ProviderCapabilities,
  ProviderSourceCondition,
  ProviderSourceSnapshot
} from "@token-floor/protocol";

export interface ProviderCollectorReport {
  rootExists: boolean;
  fileCount: number;
  validRecordCount: number;
  latestRecordAt?: string;
  malformedRecordCount: number;
  readErrorCount: number;
}

export const providerCapabilities: Record<"codex" | "claude-code", ProviderCapabilities> = {
  codex: {
    lifecycle: true,
    subagents: true,
    transcriptRecovery: true,
    usage: "weekly-percentage"
  },
  "claude-code": {
    lifecycle: true,
    subagents: true,
    transcriptRecovery: true,
    usage: "weekly-percentage"
  }
};

export function emptyCollectorReport(root: string | undefined): ProviderCollectorReport {
  return {
    rootExists: root !== undefined && fs.existsSync(root),
    fileCount: 0,
    validRecordCount: 0,
    malformedRecordCount: 0,
    readErrorCount: 0
  };
}

function conditionFor(
  report: ProviderCollectorReport,
  previous: ProviderSourceSnapshot | undefined
): ProviderSourceCondition {
  if (!report.rootExists) return "missing";
  if (report.validRecordCount > 0 && report.malformedRecordCount > 0) return "malformed";
  if (report.validRecordCount > 0) return "healthy";
  if (report.malformedRecordCount > 0) return previous?.lastSuccessAt ? "stale" : "malformed";
  if (report.readErrorCount > 0) return previous?.lastSuccessAt ? "stale" : "disconnected";
  if (report.fileCount === 0 && !previous?.lastSuccessAt) return "waiting";
  return previous?.condition ?? "waiting";
}

/** Converts collector-only counters into a safe provider-neutral public snapshot. */
export function projectSourceStatus(
  provider: "codex" | "claude-code",
  report: ProviderCollectorReport,
  previous: ProviderSourceSnapshot | undefined,
  now = new Date()
): ProviderSourceSnapshot {
  const checkedAt = now.toISOString();
  const condition = conditionFor(report, previous);
  const lastSuccessAt =
    report.validRecordCount > 0 ? (report.latestRecordAt ?? checkedAt) : previous?.lastSuccessAt;
  return {
    condition,
    checkedAt,
    capabilities: providerCapabilities[provider],
    ...(lastSuccessAt ? { lastSuccessAt } : {})
  };
}

export function sourceStatusChanged(
  previous: ProviderSourceSnapshot | undefined,
  next: ProviderSourceSnapshot
): boolean {
  return (
    !previous ||
    previous.condition !== next.condition ||
    previous.lastSuccessAt !== next.lastSuccessAt ||
    JSON.stringify(previous.capabilities) !== JSON.stringify(next.capabilities)
  );
}
