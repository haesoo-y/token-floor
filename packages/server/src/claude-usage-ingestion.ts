import { normalizeClaudeUsage } from "@token-floor/adapter-claude";
import type { NormalizedEvent, UsageUpdatedEvent } from "@token-floor/protocol";
import { updateProviderUsageCache } from "./provider-usage-cache.js";

/** Persists a valid Claude CLI status snapshot before projecting it into the office. */
export function ingestClaudeUsage(
  payload: unknown,
  cachePath: string | undefined,
  acceptEvent: (event: NormalizedEvent) => void,
  now = new Date()
): UsageUpdatedEvent | undefined {
  const event = normalizeClaudeUsage(payload, now);
  if (event.usage.capability === "unavailable" || !cachePath) return undefined;
  const cache = updateProviderUsageCache(cachePath, [event], now);
  const persisted = cache.events.find((candidate) => candidate.provider === "claude-code");
  if (persisted) acceptEvent(persisted);
  return persisted;
}
