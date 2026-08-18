import { describe, expect, it } from "vitest";
import { recoverClaudeTranscript, recoverClaudeTranscriptMessages } from "./transcript-recovery.js";

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
    expect(recoverClaudeTranscript(content, new Date("2026-08-16T00:02:59.999Z"))).toMatchObject({
      type: "agent.active"
    });
    expect(recoverClaudeTranscript(content, new Date("2026-08-16T00:03:00.000Z"))).toMatchObject({
      type: "agent.completed",
      inferred: true
    });
  });

  it("recovers text blocks while excluding tool blocks", () => {
    const content = JSON.stringify({
      type: "assistant",
      sessionId: "session-9",
      cwd: "/work/project",
      timestamp: "2026-08-16T00:00:00.000Z",
      message: {
        content: [
          { type: "text", text: "Visible reply" },
          { type: "tool_use", input: "private command" }
        ]
      }
    });
    const events = recoverClaudeTranscriptMessages(content);

    expect(events[0]).toMatchObject({
      type: "agent.message",
      message: { role: "assistant", text: "Visible reply" }
    });
    expect(JSON.stringify(events)).not.toContain("private command");
  });
});
