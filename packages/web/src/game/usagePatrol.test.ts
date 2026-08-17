import { describe, expect, it } from "vitest";
import { nextUsagePatrolTarget, usagePatrolSpeed } from "./usagePatrol.js";

describe("usage NPC patrol", () => {
  it("rests before moving around a cardinal loop", () => {
    const state = { visit: 0, arrivedAt: undefined };
    expect(nextUsagePatrolTarget(state, 1000, { x: 10, y: 20 }, "codex")).toBeUndefined();
    expect(nextUsagePatrolTarget(state, 6199, { x: 10, y: 20 }, "codex")).toBeUndefined();
    expect(nextUsagePatrolTarget(state, 6200, { x: 10, y: 20 }, "codex")).toEqual({
      x: -4,
      y: 20
    });
  });

  it("gives the two executives different timing, routes, and speeds", () => {
    const codex = { visit: 0, arrivedAt: 0 };
    const claude = { visit: 0, arrivedAt: 0 };

    expect(nextUsagePatrolTarget(codex, 3500, { x: 100, y: 100 }, "codex")).toBeUndefined();
    expect(nextUsagePatrolTarget(claude, 3500, { x: 100, y: 100 }, "claude-code")).toEqual({
      x: 110,
      y: 100
    });
    expect(usagePatrolSpeed("codex")).not.toBe(usagePatrolSpeed("claude-code"));
  });
});
