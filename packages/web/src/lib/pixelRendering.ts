export const OFFICE_PIXEL_ZOOM = 2;

/**
 * Converts a measured container edge to a valid integer canvas dimension.
 * Fractional canvas dimensions produce uneven source-pixel widths after browser layout.
 */
export function resolveCanvasDimension(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.floor(value));
}
