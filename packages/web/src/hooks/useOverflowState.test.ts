import { describe, expect, it } from "vitest";
import { isElementOverflowing } from "./useOverflowState.js";

describe("isElementOverflowing", () => {
  it("detects text that exceeds the clamped content box", () => {
    expect(isElementOverflowing({ clientHeight: 74, scrollHeight: 112 })).toBe(true);
  });

  it("ignores equal dimensions and subpixel rounding noise", () => {
    expect(isElementOverflowing({ clientHeight: 74, scrollHeight: 74 })).toBe(false);
    expect(isElementOverflowing({ clientHeight: 74, scrollHeight: 75 })).toBe(false);
  });
});
