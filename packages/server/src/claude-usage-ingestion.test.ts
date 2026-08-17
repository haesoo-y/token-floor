import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { NormalizedEvent } from "@token-floor/protocol";
import { ingestClaudeUsage } from "./claude-usage-ingestion.js";
import { readProviderUsageCache } from "./provider-usage-cache.js";

describe("ingestClaudeUsage", () => {
  it("persists and projects valid CLI rate-limit metadata", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "token-floor-cli-ingestion-"));
    const cache = path.join(directory, "provider-usage.json");
    const accepted: NormalizedEvent[] = [];
    const event = ingestClaudeUsage(
      {
        session_id: "cli-session",
        rate_limits: {
          five_hour: { used_percentage: 11 },
          seven_day: { used_percentage: 32, resets_at: 1_787_276_400 }
        }
      },
      cache,
      (candidate) => accepted.push(candidate),
      new Date("2026-08-17T08:00:00Z")
    );

    expect(event?.usage).toMatchObject({
      remainingPercent: 68,
      fiveHourRemainingPercent: 89,
      resetsAt: expect.any(String)
    });
    expect(accepted).toEqual(readProviderUsageCache(cache));
    fs.rmSync(directory, { recursive: true });
  });
});
