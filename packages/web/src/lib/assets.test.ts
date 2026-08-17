import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findMissingAssets, gameAssetUrls, officeAssets } from "./assets.js";

describe("findMissingAssets", () => {
  it("reports only unavailable required files", async () => {
    const missing = await findMissingAssets(async (url) => ({ ok: url !== gameAssetUrls[1] }));
    expect(missing).toEqual([gameAssetUrls[1]]);
  });

  it("registers only the approved static office furniture", () => {
    expect(officeAssets.images.map((asset) => asset.key)).toEqual([
      "whiteboard",
      "meeting-table",
      "plant",
      "plant-small"
    ]);
    expect(officeAssets.sheets.every((asset) => asset.key.startsWith("mc-"))).toBe(true);
  });

  it("catalogs all MetroCity provider roles and excludes door assets", () => {
    const characters = officeAssets.sheets.filter((asset) => asset.key.startsWith("mc-"));
    expect(characters).toHaveLength(13);
    expect(gameAssetUrls.some((url) => /door|workstations/i.test(url))).toBe(false);
  });

  it("does not retain removed furniture URLs", () => {
    expect(
      gameAssetUrls.some((url) => /desk|chair|computer|monitor|sofa|coffee|cabinet/i.test(url))
    ).toBe(false);
  });

  it("keeps every runtime PNG canvas on the 32-pixel grid", () => {
    for (const url of gameAssetUrls) {
      const png = readFileSync(new URL(`../../public${url}`, import.meta.url));
      expect(png.toString("ascii", 1, 4)).toBe("PNG");
      expect(png.readUInt32BE(16) % 32, `${url} width`).toBe(0);
      const heightUnit = url.endsWith("furniture-whiteboard.png") ? 16 : 32;
      expect(png.readUInt32BE(20) % heightUnit, `${url} height`).toBe(0);
    }
  });

  it("crops the whiteboard canvas without forcing it into a square", () => {
    const png = readFileSync(
      new URL("../../public/assets/token-floor/furniture-whiteboard.png", import.meta.url)
    );
    expect(png.readUInt32BE(16)).toBe(64);
    expect(png.readUInt32BE(20)).toBe(48);
  });

  it("uses one uniform 128-pixel runtime tile for each room floor", () => {
    for (const { url } of officeAssets.floors) {
      const png = readFileSync(new URL(`../../public${url}`, import.meta.url));
      expect(png.readUInt32BE(16), `${url} width`).toBe(128);
      expect(png.readUInt32BE(20), `${url} height`).toBe(128);
    }
  });
});
