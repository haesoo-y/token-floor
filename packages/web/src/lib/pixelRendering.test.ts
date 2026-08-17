import { describe, expect, it } from "vitest";
import { resolveCanvasDimension, resolveOfficeZoom } from "./pixelRendering.js";

describe("resolveCanvasDimension", () => {
  it("removes fractional layout sizes that distort pixel widths", () => {
    expect(resolveCanvasDimension(960.75)).toBe(960);
    expect(resolveCanvasDimension(640.25)).toBe(640);
  });

  it("falls back to one for invalid or undersized values", () => {
    expect(resolveCanvasDimension(Number.NaN)).toBe(1);
    expect(resolveCanvasDimension(0)).toBe(1);
  });

  it("preserves whole fullscreen viewport dimensions", () => {
    expect(resolveCanvasDimension(1920)).toBe(1920);
    expect(resolveCanvasDimension(1080)).toBe(1080);
  });
});

describe("resolveOfficeZoom", () => {
  it("returns integer zoom levels only", () => {
    expect(resolveOfficeZoom(1920, 1080, 960, 640)).toBe(2);
    expect(resolveOfficeZoom(3840, 2160, 960, 640)).toBe(3);
  });
});
