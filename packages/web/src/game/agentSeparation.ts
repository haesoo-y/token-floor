import type { ActorMotionConstraints, MovingActor } from "./actorRuntime.js";
import { AVATAR_COLLISION_RADIUS, AVATAR_WORLD_SIZE } from "./avatarFactory.js";
import { officeActorMotionConstraints } from "./officeCollision.js";

const ACTOR_OBSTACLE_RADIUS = AVATAR_WORLD_SIZE - AVATAR_COLLISION_RADIUS;

/** Adds live actor bodies to the static office collision map to prevent visual overlap. */
export function agentConstraints(
  current: MovingActor,
  actors: Iterable<MovingActor>
): ActorMotionConstraints {
  const dynamicObstacles = [...actors]
    .filter((actor) => actor !== current)
    .map((actor) => ({
      x: actor.avatar.container.x - ACTOR_OBSTACLE_RADIUS,
      y: actor.avatar.container.y - ACTOR_OBSTACLE_RADIUS,
      width: ACTOR_OBSTACLE_RADIUS * 2,
      height: ACTOR_OBSTACLE_RADIUS * 2
    }));
  return {
    ...officeActorMotionConstraints,
    obstacles: [...officeActorMotionConstraints.obstacles, ...dynamicObstacles]
  };
}
