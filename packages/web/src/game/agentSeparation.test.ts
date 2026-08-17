import { describe, expect, it } from "vitest";
import type { MovingActor } from "./actorRuntime.js";
import { agentConstraints } from "./agentSeparation.js";

function actorAt(x: number, y: number): MovingActor {
  return { avatar: { container: { x, y } }, route: [], waypoint: 0 } as unknown as MovingActor;
}

describe("agent separation", () => {
  it("adds other actors as compact obstacles but excludes the moving actor", () => {
    const current = actorAt(448, 256);
    const other = actorAt(480, 256);
    const constraints = agentConstraints(current, [current, other]);
    const dynamic = constraints.obstacles.at(-1);

    expect(dynamic).toEqual({ x: 456, y: 232, width: 48, height: 48 });
  });
});
