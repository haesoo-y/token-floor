import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readClaudeUsageFile } from "./claude-usage-source.js";

describe("readClaudeUsageFile", () => {
  it("normalizes a sanitized status-line handoff", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "token-floor-usage-"));
    const filename = path.join(directory, "latest.json");
    fs.writeFileSync(
      filename,
      JSON.stringify({
        session_id: "session-1",
        rate_limits: { seven_day: { used_percentage: 25 } }
      })
    );

    expect(readClaudeUsageFile(filename, new Date("2026-08-17T00:00:00.000Z"))?.usage).toEqual({
      capability: "weekly-percentage",
      remainingPercent: 75
    });
    fs.rmSync(directory, { recursive: true });
  });

  it("ignores missing or malformed files", () => {
    expect(readClaudeUsageFile("/missing/token-floor-usage.json")).toBeUndefined();
  });

  it("reads the latest weekly value cached by Claude Desktop", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "token-floor-usage-"));
    const filename = path.join(directory, "plan-usage-history.json");
    fs.writeFileSync(
      filename,
      JSON.stringify({
        version: 2,
        samples: [{ t: 1_786_944_000_000, org: "org-1", u: { fh: 2, sd: 26 } }]
      })
    );

    expect(readClaudeUsageFile(filename)?.usage).toEqual({
      capability: "weekly-percentage",
      remainingPercent: 74,
      fiveHourRemainingPercent: 98
    });
    fs.rmSync(directory, { recursive: true });
  });
});
