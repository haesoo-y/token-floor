import { describe, expect, it } from "vitest";
import type { AgentSnapshot } from "@token-floor/protocol";
import { behaviorForAgent } from "./agentBehavior.js";

describe("behaviorForAgent", () => {
  it("gives separate subagent identities different pacing", () => {
    const first = behaviorForAgent({ id: "sub-one", kind: "subagent" } as AgentSnapshot, 0);
    const second = behaviorForAgent({ id: "sub-two", kind: "subagent" } as AgentSnapshot, 1);
    expect(first).not.toEqual(second);
  });

  it("keeps behavior stable for the same identity", () => {
    const agent = { id: "stable", kind: "main" } as AgentSnapshot;
    expect(behaviorForAgent(agent, 2)).toEqual(behaviorForAgent(agent, 2));
  });

  it("keeps lounge pauses long enough to avoid constant motion", () => {
    expect(
      behaviorForAgent({ id: "sub", kind: "subagent" } as AgentSnapshot, 0).pauseMs
    ).toBeGreaterThanOrEqual(9000);
    expect(
      behaviorForAgent({ id: "main", kind: "main" } as AgentSnapshot, 0).pauseMs
    ).toBeGreaterThanOrEqual(11000);
  });
});
