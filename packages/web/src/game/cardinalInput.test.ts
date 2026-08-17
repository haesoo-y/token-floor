import { describe, expect, it } from "vitest";
import { resolveCardinalIntent } from "./cardinalInput.js";

describe("resolveCardinalIntent", () => {
  it("supports a single direction", () => {
    expect(
      resolveCardinalIntent({ up: true, down: false, left: false, right: false }, "horizontal")
    ).toEqual({ x: 0, y: -1 });
  });

  it("never returns a diagonal vector", () => {
    const state = { up: true, down: false, left: false, right: true };
    expect(resolveCardinalIntent(state, "horizontal")).toEqual({ x: 1, y: 0 });
    expect(resolveCardinalIntent(state, "vertical")).toEqual({ x: 0, y: -1 });
  });

  it("cancels opposing keys on the same axis", () => {
    expect(
      resolveCardinalIntent({ up: false, down: false, left: true, right: true }, "horizontal")
    ).toEqual({ x: 0, y: 0 });
  });
});
