import { describe, expect, it } from "vitest";
import type { AgentSnapshot } from "@token-floor/protocol";
import { agentDestinationChanged, behaviorForAgent } from "./agentBehavior.js";

const agent = { id: "agent", kind: "main", status: "active" } as AgentSnapshot;

describe("agentDestinationChanged", () => {
  it("recalculates routes for status and roster destination changes", () => {
    expect(agentDestinationChanged(agent, { ...agent, status: "completed" }, 0, 0)).toBe(true);
    expect(agentDestinationChanged(agent, agent, 0, 1)).toBe(true);
    expect(agentDestinationChanged(agent, agent, 0, 0)).toBe(false);
  });
});

describe("behaviorForAgent", () => {
  it("gives separate subagent identities different pacing", () => {
    const first = behaviorForAgent({ id: "sub-one", kind: "subagent" } as AgentSnapshot, 0);
    const second = behaviorForAgent({ id: "sub-two", kind: "subagent" } as AgentSnapshot, 1);
    expect(first).not.toEqual(second);
  });

  it("keeps behavior stable for the same identity", () => {
    const stable = { id: "stable", kind: "main" } as AgentSnapshot;
    expect(behaviorForAgent(stable, 2)).toEqual(behaviorForAgent(stable, 2));
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
