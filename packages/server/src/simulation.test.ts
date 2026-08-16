import { describe, expect, it } from "vitest";
import { createInitialEvents, createScenarioEvent } from "./simulation.js";

describe("simulated event stream", () => {
  it("starts both providers and their subagents", () => {
    const events = createInitialEvents(new Date("2026-08-16T00:00:00.000Z"));
    const agentEvents = events.filter((event) => event.type.startsWith("agent."));
    expect(new Set(agentEvents.map((event) => event.provider))).toEqual(
      new Set(["codex", "claude-code"])
    );
    expect(agentEvents.some((event) => "agent" in event && event.agent.kind === "subagent")).toBe(
      true
    );
  });

  it("cycles through user waiting, completion, failure, and activity", () => {
    expect([0, 1, 2, 3, 4].map((step) => createScenarioEvent(step).type)).toEqual([
      "agent.active",
      "agent.waiting",
      "agent.completed",
      "agent.failed",
      "agent.active"
    ]);
  });
});
