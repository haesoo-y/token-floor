import { describe, expect, it } from "vitest";
import { normalizeClaudeHook } from "./normalize.js";

const base = {
  session_id: "session-1",
  transcript_path: "/private/transcript.jsonl",
  cwd: "/work/token-floor"
};
const now = new Date("2026-08-16T00:00:00.000Z");

describe("normalizeClaudeHook", () => {
  it("projects tool activity without retaining tool input", () => {
    const event = normalizeClaudeHook(
      {
        ...base,
        hook_event_name: "PostToolUse",
        tool_name: "Bash",
        tool_input: { command: "secret" }
      },
      now
    );
    expect(event).toMatchObject({
      type: "agent.active",
      provider: "claude-code",
      project: { label: "token-floor" },
      activity: { tool: "Bash", summary: "Using Bash" }
    });
    expect(JSON.stringify(event)).not.toContain("secret");
  });

  it("links subagents to the main Claude session", () => {
    const event = normalizeClaudeHook(
      { ...base, hook_event_name: "SubagentStart", agent_id: "agent-7", agent_type: "Explore" },
      now
    );
    expect(event?.agent).toEqual({
      id: "claude:session-1:agent-7",
      kind: "subagent",
      parentId: "claude:session-1"
    });
  });

  it("maps permission and terminal events to lifecycle states", () => {
    expect(normalizeClaudeHook({ ...base, hook_event_name: "PermissionRequest" }, now)?.type).toBe(
      "agent.waiting"
    );
    expect(normalizeClaudeHook({ ...base, hook_event_name: "Stop" }, now)?.type).toBe(
      "agent.completed"
    );
    expect(normalizeClaudeHook({ ...base, hook_event_name: "StopFailure" }, now)?.type).toBe(
      "agent.failed"
    );
  });
});
