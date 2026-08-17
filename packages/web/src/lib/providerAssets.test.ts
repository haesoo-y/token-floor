import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";

const RED_OUTFIT = new Set(["159,63,49", "178,71,55", "225,100,81"]);
const BLUE_OUTFIT = new Set(["24,49,101", "40,82,166", "69,142,255"]);

describe("provider character assets", () => {
  it("keeps both Codex subagent torso garments blue across every frame", () => {
    for (const name of ["mc-codex-sub-0", "mc-codex-sub-1"]) {
      const png = readFileSync(
        new URL(`../../public/assets/token-floor/characters/${name}.png`, import.meta.url)
      );
      const image = decodeRgba(png);
      let bluePixels = 0;
      let redPixels = 0;
      for (let frame = 0; frame < image.width / 32; frame += 1) {
        for (let y = 19; y < 24; y += 1) {
          for (let x = 13; x < 19; x += 1) {
            const color = pixelKey(image, frame * 32 + x, y);
            if (BLUE_OUTFIT.has(color)) bluePixels += 1;
            if (RED_OUTFIT.has(color)) redPixels += 1;
          }
        }
      }
      expect(bluePixels, `${name} blue torso coverage`).toBeGreaterThan(400);
      expect(redPixels, `${name} remaining red torso pixels`).toBe(0);
    }
  });
});

interface RgbaImage {
  width: number;
  pixels: Buffer;
}

function pixelKey(image: RgbaImage, x: number, y: number): string {
  const offset = (y * image.width + x) * 4;
  return `${image.pixels[offset]},${image.pixels[offset + 1]},${image.pixels[offset + 2]}`;
}

function decodeRgba(png: Buffer): RgbaImage {
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (png[24] !== 8 || png[25] !== 6 || png[28] !== 0) throw new Error("Expected RGBA8 PNG");
  const chunks: Buffer[] = [];
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset);
    if (png.toString("ascii", offset + 4, offset + 8) === "IDAT") {
      chunks.push(png.subarray(offset + 8, offset + 8 + length));
    }
    offset += length + 12;
  }
  const encoded = inflateSync(Buffer.concat(chunks));
  const stride = width * 4;
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    const sourceOffset = y * (stride + 1);
    const filter = encoded[sourceOffset]!;
    for (let x = 0; x < stride; x += 1) {
      const left = x >= 4 ? pixels[y * stride + x - 4]! : 0;
      const up = y > 0 ? pixels[(y - 1) * stride + x]! : 0;
      const upperLeft = y > 0 && x >= 4 ? pixels[(y - 1) * stride + x - 4]! : 0;
      const value = encoded[sourceOffset + x + 1]!;
      pixels[y * stride + x] = (value + predictor(filter, left, up, upperLeft)) & 0xff;
    }
  }
  return { width, pixels };
}

function predictor(filter: number, left: number, up: number, upperLeft: number): number {
  if (filter === 0) return 0;
  if (filter === 1) return left;
  if (filter === 2) return up;
  if (filter === 3) return Math.floor((left + up) / 2);
  if (filter !== 4) throw new Error(`Unsupported PNG filter ${filter}`);
  const estimate = left + up - upperLeft;
  const distances = [
    Math.abs(estimate - left),
    Math.abs(estimate - up),
    Math.abs(estimate - upperLeft)
  ];
  if (distances[0]! <= distances[1]! && distances[0]! <= distances[2]!) return left;
  return distances[1]! <= distances[2]! ? up : upperLeft;
}
