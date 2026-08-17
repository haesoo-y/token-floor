import type { UsageUpdatedEvent } from "@token-floor/protocol";

interface RateLimitWindow {
  used_percentage?: unknown;
  utilization?: unknown;
  resets_at?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rateLimitWindow(value: unknown): RateLimitWindow | undefined {
  return isRecord(value) ? value : undefined;
}

function usedPercentage(window: RateLimitWindow | undefined): number | undefined {
  const value = window?.used_percentage ?? window?.utilization;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100
    ? value
    : undefined;
}

function resetTime(window: RateLimitWindow | undefined): string | undefined {
  const value = window?.resets_at;
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value * 1000).toISOString();
  }
  if (typeof value !== "string") return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : undefined;
}

function usageEvent(
  sessionId: string,
  occurredAt: string,
  used: number,
  resetsAt?: string,
  fiveHourUsed?: number
): UsageUpdatedEvent {
  return {
    schemaVersion: 1,
    eventId: `claude-usage:${sessionId}:${occurredAt}`,
    occurredAt,
    provider: "claude-code",
    sessionId,
    type: "usage.updated",
    usage: {
      capability: "weekly-percentage",
      remainingPercent: Math.max(0, Math.min(100, 100 - used)),
      ...(typeof fiveHourUsed === "number"
        ? { fiveHourRemainingPercent: Math.max(0, Math.min(100, 100 - fiveHourUsed)) }
        : {}),
      ...(resetsAt ? { resetsAt } : {})
    }
  };
}

/** Converts Claude Desktop's local plan usage history into normalized weekly usage. */
export function normalizeClaudeDesktopUsageHistory(value: unknown): UsageUpdatedEvent | undefined {
  const input = isRecord(value) ? value : {};
  if (!Array.isArray(input.samples)) return undefined;
  for (let index = input.samples.length - 1; index >= 0; index -= 1) {
    const sample = isRecord(input.samples[index]) ? input.samples[index] : {};
    const usage = isRecord(sample.u) ? sample.u : {};
    if (typeof usage.sd !== "number" || !Number.isFinite(usage.sd)) continue;
    if (usage.sd < 0 || usage.sd > 100 || typeof sample.t !== "number") continue;
    const occurredAt = new Date(sample.t).toISOString();
    const fiveHourUsed =
      typeof usage.fh === "number" && Number.isFinite(usage.fh) ? usage.fh : undefined;
    return usageEvent("desktop", occurredAt, usage.sd, undefined, fiveHourUsed);
  }
  return undefined;
}

/** Converts Claude's locally cached OAuth usage response into normalized remaining usage. */
export function normalizeClaudeApiUsage(
  value: unknown,
  occurredAt = new Date(),
  sessionId = "local-cache"
): UsageUpdatedEvent | undefined {
  const input = isRecord(value) ? value : {};
  const weekly = rateLimitWindow(input.seven_day);
  const fiveHour = rateLimitWindow(input.five_hour);
  const weeklyUsed = usedPercentage(weekly);
  if (weeklyUsed === undefined) return undefined;
  return usageEvent(
    sessionId,
    occurredAt.toISOString(),
    weeklyUsed,
    resetTime(weekly),
    usedPercentage(fiveHour)
  );
}

/** Converts the official Claude status-line seven-day limit into normalized remaining usage. */
export function normalizeClaudeUsage(value: unknown, now = new Date()): UsageUpdatedEvent {
  const input = isRecord(value) ? value : {};
  const rateLimits = isRecord(input.rate_limits) ? input.rate_limits : {};
  const weekly = rateLimitWindow(rateLimits.seven_day);
  const fiveHour = rateLimitWindow(rateLimits.five_hour);
  const used = usedPercentage(weekly);
  const occurredAt = now.toISOString();
  const sessionId = typeof input.session_id === "string" ? input.session_id : "status-line";
  const base = {
    schemaVersion: 1 as const,
    eventId: `claude-usage:${sessionId}:${occurredAt}`,
    occurredAt,
    provider: "claude-code",
    sessionId,
    type: "usage.updated" as const
  };
  if (used === undefined) {
    return {
      ...base,
      usage: {
        capability: "unavailable",
        unavailableReason:
          "No Claude status-line usage received; Claude Desktop stream sessions do not emit this data"
      }
    };
  }
  return usageEvent(sessionId, occurredAt, used, resetTime(weekly), usedPercentage(fiveHour));
}
