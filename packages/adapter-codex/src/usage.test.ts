import { describe, expect, it } from "vitest";
import { normalizeCodexUsage } from "./usage.js";

describe("normalizeCodexUsage", () => {
  it("selects the weekly window from a local token-count record", () => {
    expect(
      normalizeCodexUsage(
        {
          timestamp: "2026-08-17T04:42:09.984Z",
          type: "event_msg",
          payload: {
            type: "token_count",
            rate_limits: {
              primary: { used_percent: 12, window_minutes: 300 },
              secondary: { used_percent: 47, window_minutes: 10_080, resets_at: 1_787_198_802 }
            }
          }
        },
        "session-1"
      )
    ).toMatchObject({
      provider: "codex",
      sessionId: "session-1",
      usage: {
        capability: "weekly-percentage",
        remainingPercent: 53,
        fiveHourRemainingPercent: 88
      }
    });
  });

  it("ignores records without a weekly window", () => {
    expect(
      normalizeCodexUsage({
        type: "event_msg",
        payload: {
          type: "token_count",
          rate_limits: { primary: { used_percent: 12, window_minutes: 300 } }
        }
      })
    ).toBeUndefined();
  });
});
