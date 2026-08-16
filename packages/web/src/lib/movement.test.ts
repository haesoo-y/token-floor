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

  it("keeps the player outside furniture collision rectangles", () => {
    const current = { x: 35, y: 50 };
    expect(resolveMovement(current, { x: 10, y: 0 }, bounds, obstacles)).toBe(current);
  });
});
