import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readLatestClaudeCliUsage } from "./claude-cli-usage-source.js";

describe("readLatestClaudeCliUsage", () => {
  it("finds a nested rate-limit snapshot in recent CLI session data", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-floor-claude-cli-"));
    const project = path.join(root, "projects", "project-a");
    fs.mkdirSync(project, { recursive: true });
    fs.writeFileSync(
      path.join(project, "session.jsonl"),
      `${JSON.stringify({
        type: "rate_limit_event",
        timestamp: "2026-08-17T07:00:00Z",
        rate_limit_info: {
          five_hour: { utilization: 7, resets_at: "2026-08-17T10:00:00Z" },
          seven_day: { utilization: 31, resets_at: "2026-08-22T00:00:00Z" }
        }
      })}\n`
    );

    expect(readLatestClaudeCliUsage(root)).toMatchObject({
      occurredAt: "2026-08-17T07:00:00.000Z",
      sessionId: "cli-local-cache",
      usage: {
        remainingPercent: 69,
        fiveHourRemainingPercent: 93,
        resetsAt: "2026-08-22T00:00:00.000Z"
      }
    });
    fs.rmSync(root, { recursive: true });
  });
});
