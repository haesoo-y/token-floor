import {
  resolveMovement,
  type MovementBounds,
  type Point,
  type Rectangle
} from "../lib/movement.js";
import { moveToward } from "./actorMotion.js";
import { setAvatarFrame, type AvatarParts } from "./avatarFactory.js";

export interface MovingActor {
  avatar: AvatarParts;
  route: Point[];
  waypoint: number;
  moving: boolean;
}

export interface ActorMotionConstraints {
  bounds: MovementBounds;
  obstacles: readonly Rectangle[];
  clearance: number;
}

export function replaceRoute(actor: MovingActor, route: readonly Point[]): void {
  actor.route = [...route];
  actor.waypoint = 0;
}

/** Advances one actor along a cardinal route without diagonal interpolation. */
export function advanceActor(
  actor: MovingActor,
  delta: number,
  time: number,
  speed = 0.045,
  constraints?: ActorMotionConstraints
): void {
  const target = actor.route[actor.waypoint];
  if (!target) {
    actor.moving = false;
    setAvatarFrame(actor.avatar, actor.avatar.facing, 0);
    return;
  }
  const current = { x: actor.avatar.container.x, y: actor.avatar.container.y };
  const step = moveToward(current, target, speed * delta, actor.avatar.facing);
  const point = constraints
    ? resolveMovement(
        current,
        { x: step.point.x - current.x, y: step.point.y - current.y },
        constraints.bounds,
        constraints.obstacles,
        constraints.clearance
      )
    : step.point;
  const moved = point.x !== current.x || point.y !== current.y;
  actor.avatar.container.setPosition(point.x, point.y).setDepth(point.y);
  setAvatarFrame(actor.avatar, step.facing, moved ? Math.floor(time / 110) % 6 : 0);
  actor.moving = moved;
  if (point.x === target.x && point.y === target.y) actor.waypoint += 1;
}

export function routeComplete(actor: MovingActor): boolean {
  return actor.waypoint >= actor.route.length;
}
