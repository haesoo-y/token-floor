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
        hook_event_name: "SessionStart"
      },
      new Date("2026-08-16T00:00:00.000Z")
    );
    expect(result.state.agents["claude:live-session"]).toMatchObject({
      provider: "claude-code",
      status: "active"
    });
  });
});
