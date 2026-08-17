/**
 * Converts a measured container edge to a valid integer canvas dimension.
 * Fractional canvas dimensions produce uneven source-pixel widths after browser layout.
 */
export function resolveCanvasDimension(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.floor(value));
}

/** Returns a close integer zoom so the default view stays dense without softening pixels. */
export function resolveOfficeZoom(
  viewportWidth: number,
  viewportHeight: number,
  worldWidth: number,
  worldHeight: number
): number {
  const contained = Math.min(viewportWidth / worldWidth, viewportHeight / worldHeight);
  return Math.max(2, Math.floor(contained));
}
