import { describe, expect, it } from "vitest";
import { recoverClaudeTranscript } from "./transcript-recovery.js";

describe("recoverClaudeTranscript", () => {
  it("recovers lifecycle metadata without retaining transcript content", () => {
    const content = [
      JSON.stringify({
        type: "user",
        sessionId: "session-7",
        cwd: "/work/private-project",
        timestamp: "2026-08-16T00:00:00.000Z",
        isSidechain: false,
        message: { content: "private prompt" }
      }),
      "malformed"
    ].join("\n");
    const event = recoverClaudeTranscript(content, new Date("2026-08-16T00:01:00.000Z"));
    expect(event).toMatchObject({
      type: "agent.active",
      sessionId: "session-7",
      project: { label: "private-project" }
    });
    expect(JSON.stringify(event)).not.toContain("private prompt");
  });

  it("infers completion for a transcript that is no longer changing", () => {
    const content = JSON.stringify({
      sessionId: "session-8",
      cwd: "/work/project",
      timestamp: "2026-08-16T00:00:00.000Z",
      isSidechain: false
    });
    expect(recoverClaudeTranscript(content, new Date("2026-08-16T00:06:00.000Z"))).toMatchObject({
      type: "agent.completed",
      inferred: true
    });
  });
});
