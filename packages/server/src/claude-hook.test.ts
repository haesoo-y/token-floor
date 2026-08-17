import { describe, expect, it } from "vitest";
import { createOfficeState } from "@token-floor/protocol";
import { ingestClaudeHook } from "./claude-ingestion.js";

describe("Claude hook endpoint", () => {
  it("projects a real hook into the server snapshot", () => {
    const result = ingestClaudeHook(
      createOfficeState(),
      {
        session_id: "live-session",
        transcript_path: "/private/transcript.jsonl",
        cwd: "/work/token-floor",
        hook_event_name: "UserPromptSubmit"
      },
      new Date("2026-08-16T00:00:00.000Z")
    );
    expect(result.state.agents["claude:live-session"]).toMatchObject({
      provider: "claude-code",
      status: "active"
    });
  });

  it("ignores terminal events for sessions that never entered the office", () => {
    const result = ingestClaudeHook(
      createOfficeState(),
      {
        session_id: "helper-session",
        transcript_path: "/private/transcript.jsonl",
        cwd: "/work/token-floor",
        hook_event_name: "SessionEnd"
      },
      new Date("2026-08-16T00:00:00.000Z")
    );
    expect(result.event).toBeUndefined();
    expect(result.state.agents).toEqual({});
  });
});
