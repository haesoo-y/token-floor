import { describe, expect, it } from "vitest";
import type { AgentSnapshot } from "@token-floor/protocol";
import { countAgentStatuses } from "./stats.js";

function agent(status: AgentSnapshot["status"]): AgentSnapshot {
  return {
    id: status,
    sessionId: "s",
    provider: "codex",
    projectId: "p",
    projectLabel: "p",
    kind: "main",
    status,
    lastEventAt: "2026-08-16T00:00:00.000Z",
    inferredCompletion: false
  };
}

describe("countAgentStatuses", () => {
  it("counts all four product states", () => {
    expect(
      countAgentStatuses({ a: agent("active"), w: agent("waiting"), e: agent("error") })
    ).toEqual({
      active: 1,
      waiting: 1,
      completed: 0,
      error: 1
    });
  });
});
