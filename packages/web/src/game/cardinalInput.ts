import type { Point } from "../lib/movement.js";

export type InputAxis = "horizontal" | "vertical";

export interface DirectionState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

/** Resolves simultaneous key presses to one axis, preventing diagonal player movement. */
export function resolveCardinalIntent(state: DirectionState, preferred: InputAxis): Point {
  const x = Number(state.right) - Number(state.left);
  const y = Number(state.down) - Number(state.up);
  if (x !== 0 && y !== 0) return preferred === "horizontal" ? { x, y: 0 } : { x: 0, y };
  return { x, y };
}
