import { describe, expect, it } from "vitest";
import { randomChoiceExcept } from "./randomChoice.js";

describe("random choice", () => {
  it("selects across the collection using the supplied random draw", () => {
    expect(randomChoiceExcept(["a", "b", "c"], undefined, () => 0)).toBe("a");
    expect(randomChoiceExcept(["a", "b", "c"], undefined, () => 0.999)).toBe("c");
  });

  it("excludes the previous choice without reducing the available range", () => {
    expect(randomChoiceExcept(["a", "b", "c"], "a", () => 0)).toBe("b");
    expect(randomChoiceExcept(["a", "b", "c"], "b", () => 0.999)).toBe("c");
  });

  it("handles a single-item collection", () => {
    expect(randomChoiceExcept(["only"], "only", () => 0.5)).toBe("only");
  });
});
