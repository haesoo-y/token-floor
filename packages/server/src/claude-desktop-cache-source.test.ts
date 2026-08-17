import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { zstdCompressSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { readLatestClaudeDesktopCache } from "./claude-desktop-cache-source.js";

describe("readLatestClaudeDesktopCache", () => {
  it("decodes the newest valid compressed usage response", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "token-floor-claude-cache-"));
    const filename = path.join(directory, "abcdef_0");
    const payload = {
      five_hour: { utilization: 4, resets_at: "2026-08-17T09:30:00Z" },
      seven_day: { utilization: 18, resets_at: "2026-08-21T07:00:00Z" }
    };
    fs.writeFileSync(
      filename,
      Buffer.concat([
        Buffer.from("1/0/https://claude.ai/api/organizations/org/usage?skip_spend=1"),
        zstdCompressSync(Buffer.from(JSON.stringify(payload)))
      ])
    );
    fs.utimesSync(filename, new Date("2026-08-17T06:00:00Z"), new Date("2026-08-17T06:00:00Z"));

    expect(readLatestClaudeDesktopCache(directory)).toMatchObject({
      occurredAt: "2026-08-17T06:00:00.000Z",
      sessionId: "desktop-http-cache",
      usage: {
        remainingPercent: 82,
        fiveHourRemainingPercent: 96,
        resetsAt: "2026-08-21T07:00:00.000Z"
      }
    });
    fs.rmSync(directory, { recursive: true });
  });
});
