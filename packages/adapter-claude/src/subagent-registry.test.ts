import { describe, expect, it } from "vitest";
import type { AgentEvent } from "@token-floor/protocol";
import { ClaudeSubagentRegistry } from "./subagent-registry.js";

function event(type: "agent.active" | "agent.completed", executionId: string): AgentEvent {
  const base = {
    schemaVersion: 1 as const,
    eventId: `${type}:${executionId}`,
    occurredAt: "2026-08-17T00:00:00.000Z",
    provider: "claude-code",
    sessionId: "session-1",
    agent: {
      id: "claude:session-1:sub:0",
      kind: "subagent" as const,
      parentId: "claude:session-1",
      executionId
    },
    project: { id: "/work/token-floor", label: "token-floor" }
  };
  return type === "agent.completed"
    ? { ...base, type, inferred: false }
    : { ...base, type, activity: { summary: "Working" } };
}

describe("ClaudeSubagentRegistry", () => {
  it("rebuilds occupied slots from persisted active executions", () => {
    const registry = ClaudeSubagentRegistry.fromEvents([event("agent.active", "agent-1")]);
    expect(registry.resolve("session-1", "agent-1").slot).toBe(0);
    expect(registry.resolve("session-1", "agent-2").slot).toBe(1);
  });

  it("releases persisted completed executions for reuse", () => {
    const registry = ClaudeSubagentRegistry.fromEvents([
      event("agent.active", "agent-1"),
      event("agent.completed", "agent-1")
    ]);
    expect(registry.resolve("session-1", "agent-2").slot).toBe(0);
  });
});
