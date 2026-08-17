import type { UsageUpdatedEvent } from "@token-floor/protocol";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

interface LimitWindow {
  used: number;
  minutes: number;
  resetsAt?: string;
}

function limitWindow(value: unknown): LimitWindow | undefined {
  if (!isRecord(value)) return undefined;
  if (
    typeof value.used_percent !== "number" ||
    !Number.isFinite(value.used_percent) ||
    value.used_percent < 0 ||
    value.used_percent > 100 ||
    typeof value.window_minutes !== "number"
  ) {
    return undefined;
  }
  return {
    used: value.used_percent,
    minutes: value.window_minutes,
    ...(typeof value.resets_at === "number" && Number.isFinite(value.resets_at)
      ? { resetsAt: new Date(value.resets_at * 1000).toISOString() }
      : {})
  };
}

/** Converts a provider-owned Codex token-count record into normalized weekly usage. */
export function normalizeCodexUsage(
  value: unknown,
  sessionId = "local"
): UsageUpdatedEvent | undefined {
  if (!isRecord(value) || value.type !== "event_msg" || !isRecord(value.payload)) return undefined;
  if (value.payload.type !== "token_count" || !isRecord(value.payload.rate_limits))
    return undefined;
  const limits = value.payload.rate_limits;
  const windows = [limitWindow(limits.primary), limitWindow(limits.secondary)].filter(
    (window): window is LimitWindow => window !== undefined
  );
  const weekly = [...windows].sort((left, right) => right.minutes - left.minutes)[0];
  const fiveHour = windows.find((window) => window.minutes === 5 * 60);
  if (!weekly || weekly.minutes < 7 * 24 * 60 || typeof value.timestamp !== "string") {
    return undefined;
  }
  const occurredAt = new Date(value.timestamp).toISOString();
  return {
    schemaVersion: 1,
    eventId: `codex-usage:${sessionId}:${occurredAt}`,
    occurredAt,
    provider: "codex",
    sessionId,
    type: "usage.updated",
    usage: {
      capability: "weekly-percentage",
      remainingPercent: Math.max(0, Math.min(100, 100 - weekly.used)),
      ...(fiveHour
        ? { fiveHourRemainingPercent: Math.max(0, Math.min(100, 100 - fiveHour.used)) }
        : {}),
      ...(weekly.resetsAt ? { resetsAt: weekly.resetsAt } : {})
    }
  };
}
