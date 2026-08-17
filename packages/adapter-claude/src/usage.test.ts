import { describe, expect, it } from "vitest";
import {
  normalizeClaudeApiUsage,
  normalizeClaudeDesktopUsageHistory,
  normalizeClaudeUsage
} from "./usage.js";

const now = new Date("2026-08-17T00:00:00.000Z");

describe("normalizeClaudeUsage", () => {
  it("converts official seven-day used percentage into remaining usage", () => {
    expect(
      normalizeClaudeUsage(
        {
          session_id: "session-1",
          rate_limits: {
            five_hour: { used_percentage: 12 },
            seven_day: { used_percentage: 31, resets_at: 1_787_040_000 }
          }
        },
        now
      )
    ).toMatchObject({
      provider: "claude-code",
      usage: {
        capability: "weekly-percentage",
        remainingPercent: 69,
        fiveHourRemainingPercent: 88
      }
    });
  });

  it("reports unavailable instead of estimating absent subscription limits", () => {
    expect(normalizeClaudeUsage({ session_id: "api-session" }, now).usage).toMatchObject({
      capability: "unavailable",
      unavailableReason:
        "No Claude status-line usage received; Claude Desktop stream sessions do not emit this data"
    });
  });
});

describe("normalizeClaudeDesktopUsageHistory", () => {
  it("uses the latest Desktop sample that contains weekly utilization", () => {
    expect(
      normalizeClaudeDesktopUsageHistory({
        version: 2,
        samples: [
          { t: 1_786_944_000_000, org: "org-1", u: { fh: 8, sd: 31 } },
          { t: 1_786_944_300_000, org: "org-1", u: { fh: 8 } }
        ]
      })
    ).toMatchObject({
      occurredAt: "2026-08-17T05:20:00.000Z",
      sessionId: "desktop",
      usage: {
        capability: "weekly-percentage",
        remainingPercent: 69,
        fiveHourRemainingPercent: 92
      }
    });
  });

  it("ignores malformed Desktop history", () => {
    expect(normalizeClaudeDesktopUsageHistory({ samples: [{ u: { sd: "31" } }] })).toBeUndefined();
  });
});

describe("normalizeClaudeApiUsage", () => {
  it("normalizes cached CLI and Desktop usage responses with reset timestamps", () => {
    expect(
      normalizeClaudeApiUsage(
        {
          five_hour: { utilization: 2, resets_at: "2026-08-17T09:29:59.525894+00:00" },
          seven_day: { utilization: 26, resets_at: "2026-08-21T06:59:59.525917+00:00" }
        },
        new Date("2026-08-17T06:00:00.000Z"),
        "desktop-http-cache"
      )
    ).toMatchObject({
      occurredAt: "2026-08-17T06:00:00.000Z",
      sessionId: "desktop-http-cache",
      usage: {
        remainingPercent: 74,
        fiveHourRemainingPercent: 98,
        resetsAt: "2026-08-21T06:59:59.525Z"
      }
    });
  });
});
