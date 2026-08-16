import { describe, expect, it } from "vitest";
import { framesForProvider } from "./avatar.js";

describe("framesForProvider", () => {
  it("reserves blue and orange outfit rows for the built-in providers", () => {
    expect(framesForProvider("codex", "a").bodyFrame).toBe(48);
    expect(framesForProvider("claude-code", "b").bodyFrame).toBe(72);
  });

  it("assigns stable appearance details for the same identity", () => {
    expect(framesForProvider("future-agent", "same")).toEqual(
      framesForProvider("future-agent", "same")
    );
  });
});
