import { describe, expect, it } from "vitest";
import { metroCityManifest } from "./manifest.js";
import { normalizeAssetPath, validateAssetInventory } from "./validation.js";

const completeInventory = metroCityManifest.files.map(({ path, width, height }) => ({
  path,
  width,
  height
}));

describe("MetroCity asset validation", () => {
  it("accepts the inspected free-pack dimensions", () => {
    expect(validateAssetInventory(metroCityManifest, completeInventory)).toEqual({
      valid: true,
      missing: [],
      mismatched: [],
      unsafe: []
    });
  });

  it("reports required missing files and dimension drift", () => {
    const inventory = completeInventory
      .filter((file) => file.path !== "MetroCity 2.0/Hair.png")
      .map((file) => (file.path.endsWith("Suit.png") ? { ...file, width: 1 } : file));
    const result = validateAssetInventory(metroCityManifest, inventory);
    expect(result.missing).toContain("MetroCity 2.0/Hair.png");
    expect(result.mismatched[0]).toMatchObject({ path: "MetroCity 2.0/Suit.png" });
    expect(result.valid).toBe(false);
  });

  it("normalizes separators but rejects traversal", () => {
    expect(normalizeAssetPath(".\\Interior\\Home\\TilesHouse.png")).toBe(
      "Interior/Home/TilesHouse.png"
    );
    expect(() => normalizeAssetPath("../secret.png")).toThrow("Unsafe asset path");
  });
});
