import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { parseNormalizedEvent, type UsageUpdatedEvent } from "@token-floor/protocol";
import { ensurePrivateDirectory } from "./private-files.js";

interface ProviderUsageCache {
  schemaVersion: 1;
  updatedAt: string;
  providers: Record<string, UsageUpdatedEvent>;
}

function detailCount(event: UsageUpdatedEvent): number {
  return Object.values(event.usage).filter((value) => value !== undefined).length;
}

function shouldReplace(current: UsageUpdatedEvent | undefined, update: UsageUpdatedEvent): boolean {
  if (!current) return true;
  const ageDifference = Date.parse(update.occurredAt) - Date.parse(current.occurredAt);
  if (Math.abs(ageDifference) <= 5_000 && detailCount(update) !== detailCount(current)) {
    return detailCount(update) > detailCount(current);
  }
  return ageDifference >= 0;
}

function parseCache(value: unknown): ProviderUsageCache | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const input = value as Record<string, unknown>;
  if (input.schemaVersion !== 1 || typeof input.providers !== "object" || !input.providers) {
    return undefined;
  }
  const providers: Record<string, UsageUpdatedEvent> = {};
  for (const [provider, candidate] of Object.entries(input.providers)) {
    try {
      const event = parseNormalizedEvent(candidate);
      if (event.type === "usage.updated" && event.provider === provider)
        providers[provider] = event;
    } catch {
      continue;
    }
  }
  return {
    schemaVersion: 1,
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : new Date(0).toISOString(),
    providers
  };
}

/** Reads only validated normalized usage snapshots from Token Floor's runtime cache. */
export function readProviderUsageCache(filename: string): UsageUpdatedEvent[] {
  try {
    const cache = parseCache(JSON.parse(fs.readFileSync(filename, "utf8")));
    return cache ? Object.values(cache.providers) : [];
  } catch {
    return [];
  }
}

/** Atomically merges fresh provider samples while preserving the last valid value for failures. */
export function updateProviderUsageCache(
  filename: string,
  updates: UsageUpdatedEvent[],
  now = new Date()
): { events: UsageUpdatedEvent[]; changed: boolean } {
  const currentEvents = readProviderUsageCache(filename);
  const providers = Object.fromEntries(currentEvents.map((event) => [event.provider, event]));
  let changed = false;
  for (const event of updates) {
    if (!shouldReplace(providers[event.provider], event)) continue;
    if (JSON.stringify(providers[event.provider]) === JSON.stringify(event)) continue;
    providers[event.provider] = event;
    changed = true;
  }
  if (!changed && fs.existsSync(filename)) return { events: Object.values(providers), changed };
  if (Object.keys(providers).length === 0) return { events: [], changed: false };
  const cache: ProviderUsageCache = {
    schemaVersion: 1,
    updatedAt: now.toISOString(),
    providers
  };
  ensurePrivateDirectory(path.dirname(filename));
  const temporary = `${filename}.${randomUUID()}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(cache, null, 2)}\n`, {
    mode: 0o600,
    flag: "wx"
  });
  fs.renameSync(temporary, filename);
  return { events: Object.values(providers), changed: true };
}
