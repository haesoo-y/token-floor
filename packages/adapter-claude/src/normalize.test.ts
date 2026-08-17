import { describe, expect, it } from "vitest";
import { normalizeClaudeHook } from "./normalize.js";
import { ClaudeSubagentRegistry } from "./subagent-registry.js";

const base = {
  session_id: "session-1",
  transcript_path: "/private/transcript.jsonl",
  cwd: "/work/token-floor"
};
const now = new Date("2026-08-16T00:00:00.000Z");

describe("normalizeClaudeHook", () => {
  it("does not create an office actor for a session that has not received work", () => {
    expect(normalizeClaudeHook({ ...base, hook_event_name: "SessionStart" }, now)).toBeUndefined();
  });

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
    expect(event?.project.id).toMatch(/^project:claude-code:[0-9a-f]{16}$/);
    expect(JSON.stringify(event)).not.toContain("/work/token-floor");
  });

  it("links subagents to the main Claude session", () => {
    const event = normalizeClaudeHook(
      { ...base, hook_event_name: "SubagentStart", agent_id: "agent-7", agent_type: "Explore" },
      now
    );
    expect(event?.agent).toEqual({
      id: "claude:session-1:sub:0",
      kind: "subagent",
      parentId: "claude:session-1",
      executionId: "agent-7",
      role: "Explore"
    });
  });

  it("reuses stopped slots without merging concurrent executions", () => {
    const registry = new ClaudeSubagentRegistry();
    const normalize = (hook_event_name: string, agent_id: string) =>
      normalizeClaudeHook(
        { ...base, hook_event_name, agent_id, agent_type: "Explore" },
        now,
        registry
      );
    expect(normalize("SubagentStart", "agent-1")?.agent.id).toBe("claude:session-1:sub:0");
    expect(normalize("SubagentStart", "agent-2")?.agent.id).toBe("claude:session-1:sub:1");
    normalize("SubagentStop", "agent-1");
    expect(normalize("SubagentStart", "agent-3")?.agent.id).toBe("claude:session-1:sub:0");
    expect(normalize("PostToolUse", "agent-1")).toBeUndefined();
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
