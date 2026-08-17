import type { Point } from "../lib/movement.js";

interface LoungeOccupant {
  snapshot: { status?: string };
  route: Point[];
  avatar: { container: { x: number; y: number } };
}

/** Reserves every completed actor's destination and the current actor's occupied spot. */
export function reservedRestSpots(
  current: LoungeOccupant,
  actors: Iterable<LoungeOccupant>
): Point[] {
  const reserved = [...actors]
    .filter((actor) => actor !== current && actor.snapshot.status === "completed")
    .map(
      (actor) => actor.route.at(-1) ?? { x: actor.avatar.container.x, y: actor.avatar.container.y }
    );
  reserved.push({ x: current.avatar.container.x, y: current.avatar.container.y });
  return reserved;
}
