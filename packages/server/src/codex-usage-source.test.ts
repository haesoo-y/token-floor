import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readLatestCodexUsage } from "./codex-usage-source.js";

describe("readLatestCodexUsage", () => {
  it("reads the latest weekly limit from the provider-owned session root", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-floor-codex-"));
    const directory = path.join(root, "2026", "08", "17");
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(
      path.join(directory, "rollout-session-1.jsonl"),
      [
        JSON.stringify({ type: "session_meta" }),
        JSON.stringify({
          timestamp: "2026-08-17T05:00:00.000Z",
          type: "event_msg",
          payload: {
            type: "token_count",
            rate_limits: {
              primary: { used_percent: 47, window_minutes: 10_080, resets_at: 1_787_198_802 }
            }
          }
        })
      ].join("\n")
    );

    expect(readLatestCodexUsage(root, new Date("2026-08-17T06:00:00.000Z"))?.usage).toMatchObject({
      capability: "weekly-percentage",
      remainingPercent: 53
    });
    fs.rmSync(root, { recursive: true });
  });

  it("ignores a missing session root", () => {
    expect(readLatestCodexUsage("/missing/codex-sessions")).toBeUndefined();
  });
});
