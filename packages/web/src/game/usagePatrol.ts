import type { Point } from "../lib/movement.js";

export interface UsagePatrolState {
  visit: number;
  arrivedAt: number | undefined;
}

export type UsageProvider = "codex" | "claude-code";

const patrolProfiles = {
  codex: {
    pauses: [5200, 6800, 4700, 6100, 5600],
    offsets: [
      { x: -14, y: 0 },
      { x: -14, y: -10 },
      { x: 12, y: -10 },
      { x: 12, y: 0 },
      { x: 0, y: 8 }
    ],
    speed: 0.019
  },
  "claude-code": {
    pauses: [3500, 5900, 4300, 7200],
    offsets: [
      { x: 10, y: 0 },
      { x: 10, y: 12 },
      { x: -10, y: 12 },
      { x: -10, y: 0 }
    ],
    speed: 0.027
  }
} as const;

/** Returns a cardinal patrol target only after the NPC has rested at its current point. */
export function nextUsagePatrolTarget(
  state: UsagePatrolState,
  time: number,
  base: Point,
  provider: UsageProvider
): Point | undefined {
  if (state.arrivedAt === undefined) {
    state.arrivedAt = time;
    return undefined;
  }
  const profile = patrolProfiles[provider];
  const pause = profile.pauses[state.visit % profile.pauses.length] ?? profile.pauses[0];
  if (time - state.arrivedAt < pause) return undefined;
  const offset = profile.offsets[state.visit % profile.offsets.length] ?? profile.offsets[0];
  state.visit += 1;
  state.arrivedAt = undefined;
  return { x: base.x + offset.x, y: base.y + offset.y };
}

/** Returns the provider-specific walking speed used to desynchronize the executive NPCs. */
export function usagePatrolSpeed(provider: UsageProvider): number {
  return patrolProfiles[provider].speed;
}
