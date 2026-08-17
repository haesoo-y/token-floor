import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { recoverClaudeProjectTranscripts } from "./claude-transcript-source.js";

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0)) fs.rmSync(directory, { recursive: true });
});

describe("recoverClaudeProjectTranscripts", () => {
  it("recovers recent main sessions and ignores sidechain transcripts", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-floor-transcripts-"));
    directories.push(root);
    fs.writeFileSync(
      path.join(root, "main.jsonl"),
      `${JSON.stringify({
        sessionId: "session-1",
        cwd: "/work/token-floor",
        timestamp: "2026-08-17T00:09:00.000Z",
        message: "not retained"
      })}\n`
    );
    fs.writeFileSync(
      path.join(root, "sub.jsonl"),
      `${JSON.stringify({
        sessionId: "session-1",
        cwd: "/work/token-floor",
        timestamp: "2026-08-17T00:09:00.000Z",
        isSidechain: true
      })}\n`
    );
    const events = recoverClaudeProjectTranscripts(
      root,
      new Date("2026-08-17T00:10:00.000Z"),
      Number.POSITIVE_INFINITY
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ sessionId: "session-1", type: "agent.active" });
    expect(JSON.stringify(events)).not.toContain("not retained");
  });
});
