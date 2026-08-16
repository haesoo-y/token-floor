import { describe, expect, it } from "vitest";
import { findMissingAssets, metroCityAssetUrls } from "./assets.js";

describe("findMissingAssets", () => {
  it("reports only unavailable required files", async () => {
    const missing = await findMissingAssets(async (url) => ({ ok: url !== metroCityAssetUrls[1] }));
    expect(missing).toEqual([metroCityAssetUrls[1]]);
  });
});
