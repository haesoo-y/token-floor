import { describe, expect, it } from "vitest";
import {
  AVATAR_FRAME_SIZE,
  AVATAR_SCALE,
  AVATAR_WORLD_SIZE,
  avatarFrame
} from "./avatarFactory.js";

describe("avatarFrame", () => {
  it("maps each direction to a distinct six-frame MetroCity group", () => {
    expect(
      ["down", "left", "right", "up"].map((facing) => avatarFrame(facing as never, 0))
    ).toEqual([0, 18, 6, 12]);
  });

  it("wraps the walk cycle within its direction row", () => {
    expect(avatarFrame("right", 5)).toBe(11);
  });

  it("renders every character at the native 32-pixel world size", () => {
    expect(AVATAR_FRAME_SIZE).toBe(32);
    expect(AVATAR_SCALE).toBe(1);
    expect(AVATAR_WORLD_SIZE).toBe(32);
  });
});
