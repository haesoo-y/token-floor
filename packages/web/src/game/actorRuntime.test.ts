import { describe, expect, it, vi } from "vitest";
import { advanceActor, replaceRoute, routeComplete, type MovingActor } from "./actorRuntime.js";

describe("actor runtime routes", () => {
  it("resets progress when a state transition assigns a new route", () => {
    const actor = { route: [], waypoint: 3, avatar: {}, moving: false } as unknown as MovingActor;
    replaceRoute(actor, [{ x: 1, y: 2 }]);
    expect(actor.waypoint).toBe(0);
    expect(routeComplete(actor)).toBe(false);
  });

  it("stops autonomous actors before their sprite footprint overlaps a wall", () => {
    const container = {
      x: 32,
      y: 50,
      setPosition: vi.fn(function (this: { x: number; y: number }, x: number, y: number) {
        this.x = x;
        this.y = y;
        return this;
      }),
      setDepth: vi.fn(function (this: object) {
        return this;
      })
    };
    const actor = {
      avatar: {
        container,
        sprite: { setFrame: vi.fn() },
        frames: {},
        facing: "right"
      },
      route: [{ x: 48, y: 50 }],
      waypoint: 0,
      moving: true
    } as unknown as MovingActor;

    advanceActor(actor, 1000, 0, 0.01, {
      bounds: { minX: 0, maxX: 100, minY: 0, maxY: 100 },
      obstacles: [{ x: 40, y: 40, width: 20, height: 20 }],
      clearance: 8
    });

    expect(container.x).toBe(32);
    expect(actor.moving).toBe(false);
    expect(actor.waypoint).toBe(0);
  });
});
