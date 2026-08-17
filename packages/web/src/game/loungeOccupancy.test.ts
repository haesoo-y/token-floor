import { describe, expect, it } from "vitest";
import { reservedRestSpots } from "./loungeOccupancy.js";

describe("lounge occupancy", () => {
  it("reserves completed destinations and the current position", () => {
    const current = {
      snapshot: { status: "completed" },
      route: [],
      avatar: { container: { x: 448, y: 256 } }
    };
    const other = {
      snapshot: { status: "completed" },
      route: [{ x: 544, y: 288 }],
      avatar: { container: { x: 512, y: 256 } }
    };

    expect(reservedRestSpots(current, [current, other])).toEqual([
      { x: 544, y: 288 },
      { x: 448, y: 256 }
    ]);
  });
});
