import { describe, expect, it } from "vitest";
import type { AgentSnapshot } from "@token-floor/protocol";
import {
  moveToward,
  nextRestSpot,
  routeForAgent,
  routeToNextRestSpot,
  routeToRestSpot
} from "./actorMotion.js";

describe("actor motion", () => {
  it("moves toward a waypoint without overshooting it", () => {
    expect(moveToward({ x: 0, y: 0 }, { x: 10, y: 0 }, 4)).toEqual({
      point: { x: 4, y: 0 },
      facing: "right",
      reached: false
    });
    expect(moveToward({ x: 8, y: 0 }, { x: 10, y: 0 }, 4).reached).toBe(true);
  });

  it("routes completed agents through the narrow room passage", () => {
    const route = routeForAgent({ status: "completed" } as AgentSnapshot, 0);
    expect(route).toEqual([
      { x: 384, y: 256 },
      { x: 432, y: 256 },
      { x: 448, y: 256 }
    ]);
  });

  it("routes reactivated agents from the lounge back through the open passage", () => {
    const agent = { status: "active", kind: "main" } as AgentSnapshot;
    expect(routeForAgent(agent, 0, { x: 544, y: 288 })).toEqual([
      { x: 432, y: 256 },
      { x: 384, y: 256 },
      { x: 144, y: 128 }
    ]);
  });

  it("stagger completed agents while they cross the shared passage", () => {
    const agent = { status: "completed" } as AgentSnapshot;
    const passageYs = [0, 1, 2, 3].map((index) => routeForAgent(agent, index)[0]?.y);
    expect(passageYs).toEqual([256, 288, 256, 288]);
  });

  it("gives subagents distinct direct destinations at the shared table", () => {
    const agent = { status: "active", kind: "subagent" } as AgentSnapshot;
    expect(routeForAgent(agent, 0)[0]).not.toEqual(routeForAgent(agent, 1)[0]);
  });

  it("moves along only one axis toward diagonal targets", () => {
    const step = moveToward({ x: 0, y: 0 }, { x: 10, y: 8 }, 4);
    expect(step.point).toEqual({ x: 4, y: 0 });
    expect(step.facing).toBe("right");
    expect(moveToward(step.point, { x: 10, y: 8 }, 4).point).toEqual({ x: 8, y: 0 });
  });

  it("keeps the last vertical facing when motion stops", () => {
    expect(moveToward({ x: 4, y: 8 }, { x: 4, y: 8 }, 4, "up").facing).toBe("up");
    expect(moveToward({ x: 4, y: 8 }, { x: 4, y: 8 }, 4, "down").facing).toBe("down");
  });

  it("uses one horizontal direction between lounge seats without a center-point reversal", () => {
    expect(routeToRestSpot({ x: 432, y: 288 }, { x: 624, y: 288 })).toEqual([
      { x: 432, y: 256 },
      { x: 624, y: 256 },
      { x: 624, y: 288 }
    ]);
  });

  it("routes subagents directly instead of reversing near their work spot", () => {
    const agent = { status: "active", kind: "subagent" } as AgentSnapshot;
    expect(routeForAgent(agent, 1)).toEqual([{ x: 208, y: 256 }]);
  });

  it("uses one of the two open entrance lanes when replanning from outside the lounge", () => {
    expect(routeToRestSpot({ x: 384, y: 224 }, { x: 544, y: 256 }, 224).slice(0, 2)).toEqual([
      { x: 384, y: 256 },
      { x: 432, y: 256 }
    ]);
    expect(routeToRestSpot({ x: 384, y: 288 }, { x: 544, y: 256 }, 288).slice(0, 2)).toEqual([
      { x: 384, y: 288 },
      { x: 432, y: 288 }
    ]);
  });

  it("varies lounge destinations while excluding occupied and current spots", () => {
    const current = nextRestSpot("agent-a", 0);
    const reserved = nextRestSpot("agent-a", 1, [current]);
    const sequence = Array.from({ length: 8 }, (_, visit) => nextRestSpot("agent-a", visit));

    expect(reserved).not.toEqual(current);
    expect(new Set(sequence.map((point) => `${point.x}:${point.y}`)).size).toBeGreaterThan(2);
  });

  it("prefers a different lounge column from occupied agents", () => {
    const occupied = [
      { x: 448, y: 256 },
      { x: 544, y: 256 }
    ];
    const destination = nextRestSpot("agent-c", 3, occupied);

    expect(occupied.every((point) => Math.abs(point.x - destination.x) >= 48)).toBe(true);
  });

  it("varies horizontal lounge lanes between visits", () => {
    const routes = Array.from({ length: 8 }, (_, visit) =>
      routeToNextRestSpot({ x: 448, y: 256 }, "agent-a", visit, [{ x: 448, y: 256 }])
    );
    const laneYs = routes.map((route) => route[0]?.y);

    expect(new Set(laneYs).size).toBeGreaterThan(1);
    expect(laneYs.every((y) => y === 224 || y === 256 || y === 288)).toBe(true);
  });
});
