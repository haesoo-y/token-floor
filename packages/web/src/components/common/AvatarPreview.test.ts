import { describe, expect, it } from "vitest";
import { previewStyle } from "./AvatarPreview.js";

describe("previewStyle", () => {
  it("uses the same coherent player sheet as the game actor", () => {
    expect(previewStyle({ texture: "mc-player-cyan" }).backgroundImage).toContain(
      "mc-player-cyan.png"
    );
  });
});
