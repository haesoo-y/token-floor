import type { UsageUpdatedEvent } from "@token-floor/protocol";
import { readLatestClaudeCliUsage } from "./claude-cli-usage-source.js";
import { readLatestClaudeDesktopCache } from "./claude-desktop-cache-source.js";
import { readClaudeUsageFile } from "./claude-usage-source.js";

export interface ClaudeLocalUsagePaths {
  cliRoot?: string | undefined;
  desktopCache?: string | undefined;
  desktopHistory?: string | undefined;
}

function detailCount(event: UsageUpdatedEvent): number {
  return [
    event.usage.remainingPercent,
    event.usage.fiveHourRemainingPercent,
    event.usage.resetsAt
  ].filter((value) => value !== undefined).length;
}

/** Selects the newest valid snapshot across independent Claude local-state sources. */
export function readLatestClaudeLocalUsage(
  paths: ClaudeLocalUsagePaths
): UsageUpdatedEvent | undefined {
  const candidates = [
    paths.cliRoot ? readLatestClaudeCliUsage(paths.cliRoot) : undefined,
    paths.desktopCache ? readLatestClaudeDesktopCache(paths.desktopCache) : undefined,
    paths.desktopHistory ? readClaudeUsageFile(paths.desktopHistory) : undefined
  ].filter((event): event is UsageUpdatedEvent => event !== undefined);
  return candidates.sort((left, right) => {
    const ageDifference = Date.parse(right.occurredAt) - Date.parse(left.occurredAt);
    // Desktop writes its detailed HTTP entry and summary history a few milliseconds apart.
    if (Math.abs(ageDifference) <= 5_000) return detailCount(right) - detailCount(left);
    return ageDifference;
  })[0];
}
