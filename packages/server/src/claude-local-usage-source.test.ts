import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { zstdCompressSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { readLatestClaudeLocalUsage } from "./claude-local-usage-source.js";

describe("readLatestClaudeLocalUsage", () => {
  it("selects the newest valid local source regardless of provider application", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-floor-claude-local-"));
    const project = path.join(root, "cli", "projects", "project-a");
    fs.mkdirSync(project, { recursive: true });
    fs.writeFileSync(
      path.join(project, "session.jsonl"),
      `${JSON.stringify({
        timestamp: "2026-08-17T07:00:00Z",
        rate_limits: {
          five_hour: { used_percentage: 8 },
          seven_day: { used_percentage: 20, resets_at: 1_787_276_400 }
        }
      })}\n`
    );
    const history = path.join(root, "plan-usage-history.json");
    fs.writeFileSync(
      history,
      JSON.stringify({ samples: [{ t: Date.parse("2026-08-17T06:00:00Z"), u: { fh: 2, sd: 4 } }] })
    );

    expect(
      readLatestClaudeLocalUsage({ cliRoot: path.join(root, "cli"), desktopHistory: history })
    ).toMatchObject({
      occurredAt: "2026-08-17T07:00:00.000Z",
      usage: { remainingPercent: 80, fiveHourRemainingPercent: 92 }
    });
    fs.rmSync(root, { recursive: true });
  });

  it("prefers a detailed cache entry written in the same refresh window", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-floor-claude-local-"));
    const cache = path.join(root, "Cache_Data");
    fs.mkdirSync(cache);
    const entry = path.join(cache, "usage_0");
    fs.writeFileSync(
      entry,
      Buffer.concat([
        Buffer.from("https://claude.ai/api/organizations/org/usage?skip_spend=1"),
        zstdCompressSync(
          Buffer.from(
            JSON.stringify({
              five_hour: { utilization: 3 },
              seven_day: { utilization: 0, resets_at: "2026-08-21T07:00:00Z" }
            })
          )
        )
      ])
    );
    const writtenAt = new Date("2026-08-17T06:40:06.597Z");
    fs.utimesSync(entry, writtenAt, writtenAt);
    const history = path.join(root, "plan-usage-history.json");
    fs.writeFileSync(
      history,
      JSON.stringify({ samples: [{ t: writtenAt.getTime() + 2, u: { fh: 3, sd: 0 } }] })
    );

    expect(
      readLatestClaudeLocalUsage({ desktopCache: cache, desktopHistory: history })
    ).toMatchObject({
      sessionId: "desktop-http-cache",
      usage: { remainingPercent: 100, fiveHourRemainingPercent: 97, resetsAt: expect.any(String) }
    });
    fs.rmSync(root, { recursive: true });
  });
});
