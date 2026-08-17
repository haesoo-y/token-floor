import type { NormalizedEvent, UsageUpdatedEvent } from "@token-floor/protocol";
import { readLatestClaudeLocalUsage } from "./claude-local-usage-source.js";
import { readLatestCodexUsage } from "./codex-usage-source.js";
import { updateProviderUsageCache } from "./provider-usage-cache.js";

interface ProviderUsageMaintenanceOptions {
  cachePath?: string | undefined;
  claudeCliRootPath?: string | undefined;
  claudeDesktopCachePath?: string | undefined;
  claudeUsagePath?: string | undefined;
  codexSessionsPath?: string | undefined;
  acceptEvent: (event: NormalizedEvent) => void;
  intervalMs?: number;
}

/** Refreshes provider roots into a normalized JSON cache, then projects only cached events. */
export function startProviderUsageMaintenance(
  options: ProviderUsageMaintenanceOptions
): () => void {
  const accepted = new Set<string>();
  const refresh = () => {
    if (!options.cachePath) return;
    const updates: UsageUpdatedEvent[] = [];
    const claudeEvent = readLatestClaudeLocalUsage({
      cliRoot: options.claudeCliRootPath,
      desktopCache: options.claudeDesktopCachePath,
      desktopHistory: options.claudeUsagePath
    });
    if (claudeEvent) updates.push(claudeEvent);
    if (options.codexSessionsPath) {
      const event = readLatestCodexUsage(options.codexSessionsPath);
      if (event) updates.push(event);
    }
    const cache = updateProviderUsageCache(options.cachePath, updates);
    for (const event of cache.events) {
      if (accepted.has(event.eventId)) continue;
      accepted.add(event.eventId);
      options.acceptEvent(event);
    }
  };
  refresh();
  const timer = options.cachePath ? setInterval(refresh, options.intervalMs ?? 15_000) : undefined;
  return () => {
    if (timer) clearInterval(timer);
  };
}
