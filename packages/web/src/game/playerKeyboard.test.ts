import { describe, expect, it } from "vitest";
import { axisForDirection, directionForArrowKey } from "./playerKeyboard.js";

describe("player keyboard ownership", () => {
  it("reserves every arrow key for cardinal player movement", () => {
    expect(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].map(directionForArrowKey)).toEqual([
      "up",
      "down",
      "left",
      "right"
    ]);
    expect(directionForArrowKey("Tab")).toBeUndefined();
  });

  it("preserves the most recently pressed cardinal axis", () => {
    expect(axisForDirection("left")).toBe("horizontal");
    expect(axisForDirection("down")).toBe("vertical");
  });
});
