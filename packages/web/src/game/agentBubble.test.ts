import { describe, expect, it } from "vitest";
import type { AgentSnapshot } from "@token-floor/protocol";
import { agentBubbleProps } from "./agentBubble.js";

const completed = { status: "completed" } as AgentSnapshot;

describe("agent bubble placement", () => {
  it("shows scripted idle dialogue only after arrival in the coffee lounge", () => {
    expect(agentBubbleProps("en", completed, { x: 304, y: 256 }, true, "Resting")).toEqual({});
    expect(agentBubbleProps("en", completed, { x: 496, y: 256 }, true, "Resting")).toEqual({
      bubble: "Resting"
    });
  });

  it("keeps live task speech available in the workspace", () => {
    const active = { status: "active", activity: { summary: "Running tests" } } as AgentSnapshot;
    expect(agentBubbleProps("en", active, { x: 304, y: 192 }, false)).toEqual({
      bubble: "Running tests"
    });
  });
});
