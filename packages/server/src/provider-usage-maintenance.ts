import type { NormalizedEvent, UsageUpdatedEvent } from "@token-floor/protocol";
import { readLatestClaudeLocalUsage } from "./claude-local-usage-source.js";
import { readLatestCodexUsage } from "./codex-usage-source.js";
import { readProviderUsageCache, updateProviderUsageCache } from "./provider-usage-cache.js";

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
    try {
      const claudeEvent = readLatestClaudeLocalUsage({
        cliRoot: options.claudeCliRootPath,
        desktopCache: options.claudeDesktopCachePath,
        desktopHistory: options.claudeUsagePath
      });
      if (claudeEvent) updates.push(claudeEvent);
    } catch {
      // Claude usage is optional and must not hide Codex lifecycle or cached usage.
    }
    if (options.codexSessionsPath) {
      try {
        const event = readLatestCodexUsage(options.codexSessionsPath);
        if (event) updates.push(event);
      } catch {
        // One provider source failing does not abort the other provider's refresh.
      }
    }
    let events: UsageUpdatedEvent[];
    try {
      events = updateProviderUsageCache(options.cachePath, updates).events;
    } catch {
      events = readProviderUsageCache(options.cachePath);
    }
    for (const event of events) {
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
