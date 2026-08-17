import { describe, expect, it } from "vitest";
import { resolveMovement } from "./movement.js";

const bounds = { minX: 0, maxX: 100, minY: 0, maxY: 100 };
const obstacles = [{ x: 40, y: 40, width: 20, height: 20 }];

describe("resolveMovement", () => {
  it("moves freely and clamps to the office boundary", () => {
    expect(resolveMovement({ x: 20, y: 20 }, { x: 10, y: 5 }, bounds, obstacles)).toEqual({
      x: 30,
      y: 25
    });
    expect(resolveMovement({ x: 90, y: 90 }, { x: 30, y: 30 }, bounds, obstacles)).toEqual({
      x: 100,
      y: 100
    });
  });

  it("keeps the player outside collision rectangles", () => {
    const current = { x: 35, y: 50 };
    expect(resolveMovement(current, { x: 10, y: 0 }, bounds, obstacles)).toBe(current);
  });

  it("keeps a square character footprint clear of walls and world bounds", () => {
    expect(resolveMovement({ x: 31, y: 50 }, { x: 2, y: 0 }, bounds, obstacles, 8)).toEqual({
      x: 31,
      y: 50
    });
    expect(resolveMovement({ x: 20, y: 20 }, { x: -30, y: -30 }, bounds, obstacles, 8)).toEqual({
      x: 8,
      y: 8
    });
  });

  it("lets a character escape a wall edge without moving farther through it", () => {
    const caughtAtEdge = { x: 43, y: 50 };

    expect(resolveMovement(caughtAtEdge, { x: -2, y: 0 }, bounds, obstacles, 8)).toEqual({
      x: 41,
      y: 50
    });
    expect(resolveMovement(caughtAtEdge, { x: 2, y: 0 }, bounds, obstacles, 8)).toBe(caughtAtEdge);
  });

  it("does not enter a different obstacle while escaping the current one", () => {
    const narrowGap = [...obstacles, { x: 20, y: 40, width: 8, height: 20 }];
    const caughtAtEdge = { x: 39, y: 50 };

    expect(resolveMovement(caughtAtEdge, { x: -4, y: 0 }, bounds, narrowGap, 8)).toBe(caughtAtEdge);
  });
});
