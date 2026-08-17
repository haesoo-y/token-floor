import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  recoverClaudeProjectTranscripts,
  recoverClaudeProjectTranscriptsWithDiagnostics
} from "./claude-transcript-source.js";

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

  it("isolates malformed rows and defers a partial final row", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-floor-transcripts-"));
    directories.push(root);
    const valid = JSON.stringify({
      sessionId: "session-safe",
      cwd: "/work/token-floor",
      timestamp: "2026-08-17T00:09:00.000Z"
    });
    fs.writeFileSync(path.join(root, "mixed.jsonl"), `${valid}\n{broken\n{"partial":`);
    const result = recoverClaudeProjectTranscriptsWithDiagnostics(
      root,
      new Date("2026-08-17T00:10:00.000Z"),
      Number.POSITIVE_INFINITY
    );
    expect(result.events).toHaveLength(1);
    expect(result.report).toMatchObject({
      validRecordCount: 1,
      malformedRecordCount: 1,
      readErrorCount: 0
    });
  });

  it("discards the incomplete first row of a bounded transcript tail", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-floor-transcripts-"));
    directories.push(root);
    const oversized = JSON.stringify({ ignored: "x".repeat(128 * 1024) });
    const valid = JSON.stringify({
      sessionId: "session-tail",
      cwd: "/work/token-floor",
      timestamp: "2026-08-17T00:09:00.000Z"
    });
    fs.writeFileSync(path.join(root, "large.jsonl"), `${oversized}\n${valid}\n`);

    const result = recoverClaudeProjectTranscriptsWithDiagnostics(
      root,
      new Date("2026-08-17T00:10:00.000Z"),
      Number.POSITIVE_INFINITY
    );

    expect(result.events).toHaveLength(1);
    expect(result.report).toMatchObject({
      validRecordCount: 1,
      malformedRecordCount: 0,
      readErrorCount: 0
    });
  });
});
