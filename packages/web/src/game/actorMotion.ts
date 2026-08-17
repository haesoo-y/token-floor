import type { AgentSnapshot } from "@token-floor/protocol";
import type { Point } from "../lib/movement.js";
import {
  LOUNGE_LANE_Y,
  LOUNGE_PASSAGE,
  PASSAGE_Y,
  isLoungePoint,
  restSpots,
  spotForAgent
} from "./officeLayout.js";
import type { Facing } from "./avatarFactory.js";

export interface MotionStep {
  point: Point;
  facing: Facing;
  reached: boolean;
}

/** Finishes the horizontal leg before the vertical leg to avoid rapid staircase motion. */
export function moveToward(
  current: Point,
  target: Point,
  distance: number,
  previousFacing: Facing = "down"
): MotionStep {
  const dx = target.x - current.x;
  const dy = target.y - current.y;
  const horizontal = dx !== 0;
  const remaining = horizontal ? Math.abs(dx) : Math.abs(dy);
  if (remaining === 0) return { point: target, facing: previousFacing, reached: true };
  const travel = Math.min(distance, remaining);
  const point = horizontal
    ? { x: current.x + Math.sign(dx) * travel, y: current.y }
    : { x: current.x, y: current.y + Math.sign(dy) * travel };
  const aligned = horizontal ? point.x === target.x : point.y === target.y;
  const reached = aligned && point.x === target.x && point.y === target.y;
  return { point, facing: facingForDelta(horizontal ? dx : 0, horizontal ? 0 : dy), reached };
}

export function routeForAgent(agent: AgentSnapshot, index: number, current?: Point): Point[] {
  const destination = spotForAgent(agent, index);
  if (agent.status === "completed") {
    const passageY = PASSAGE_Y - 16 + (index % 2) * 32;
    return [
      { x: LOUNGE_PASSAGE.left, y: passageY },
      { x: LOUNGE_PASSAGE.right, y: passageY },
      ...routeToRestSpot({ x: LOUNGE_PASSAGE.right, y: passageY }, destination, passageY)
    ];
  }
  if (current && isLoungePoint(current)) {
    const passageY = PASSAGE_Y - 16 + (index % 2) * 32;
    return [
      { x: LOUNGE_PASSAGE.right, y: passageY },
      { x: LOUNGE_PASSAGE.left, y: passageY },
      destination
    ];
  }
  if (agent.kind === "subagent") {
    return [destination];
  }
  return [destination];
}

/** Selects a stable pseudo-random free lounge spot without repeating occupied destinations. */
export function nextRestSpot(
  agentId: string,
  visit: number,
  unavailable: readonly Point[] = []
): Point {
  const separated = restSpots.filter((spot) =>
    unavailable.every((point) => Math.abs(point.x - spot.x) >= 48)
  );
  const available =
    separated.length > 0
      ? separated
      : restSpots.filter(
          (spot) => !unavailable.some((point) => point.x === spot.x && point.y === spot.y)
        );
  const candidates = available.length > 0 ? available : restSpots;
  return candidates[stableHash(`${agentId}:${visit}`) % candidates.length] ?? restSpots[0]!;
}

/** Builds a varied lounge route so agents do not repeatedly share one horizontal lane. */
export function routeToNextRestSpot(
  current: Point,
  agentId: string,
  visit: number,
  unavailable: readonly Point[] = []
): Point[] {
  const destination = nextRestSpot(agentId, visit, unavailable);
  const laneY = [224, 256, 288][stableHash(`${agentId}:lane:${visit}`) % 3] ?? LOUNGE_LANE_Y;
  return routeToRestSpot(current, destination, laneY);
}

/** Routes between rest points through the open lounge lanes. */
export function routeToRestSpot(
  current: Point,
  destination: Point,
  laneY = LOUNGE_LANE_Y
): Point[] {
  const route: Point[] = [];
  let start = current;
  if (current.x < LOUNGE_PASSAGE.right) {
    const entranceY = laneY > PASSAGE_Y ? PASSAGE_Y + 16 : PASSAGE_Y - 16;
    route.push({ x: LOUNGE_PASSAGE.left, y: entranceY }, { x: LOUNGE_PASSAGE.right, y: entranceY });
    start = route.at(-1)!;
  }
  if (start.y !== laneY) route.push({ x: start.x, y: laneY });
  if (start.x !== destination.x) route.push({ x: destination.x, y: laneY });
  if (destination.y !== laneY) route.push(destination);
  return route;
}

function facingForDelta(dx: number, dy: number): Facing {
  if (dx !== 0) return dx < 0 ? "left" : "right";
  return dy < 0 ? "up" : "down";
}

function stableHash(value: string): number {
  let result = 2166136261;
  for (const character of value) result = Math.imul(result ^ character.charCodeAt(0), 16777619);
  return result >>> 0;
}
