/** Selects one idle speaker at a time so nearby lounge bubbles do not overlap. */
export function scheduledSpeaker(
  ids: readonly string[],
  time: number,
  intervalMs = 10000
): string | undefined {
  if (ids.length === 0) return undefined;
  return ids[Math.floor(time / intervalMs) % ids.length];
}
