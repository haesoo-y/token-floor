import { describe, expect, it } from "vitest";
import { PLAYER_MOVE_PER_MS } from "./movementTuning.js";

describe("movement tuning", () => {
  it("keeps player movement at the slower exploration speed", () => {
    expect(PLAYER_MOVE_PER_MS).toBe(0.12);
  });
});
