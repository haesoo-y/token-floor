import { AVATAR_COLLISION_RADIUS } from "./avatarFactory.js";
import { collisionObstacles, PLAYER_BOUNDS } from "./officeLayout.js";

/** Shared body constraints keep office characters clear while preserving narrow passages. */
export const officeActorMotionConstraints = {
  bounds: PLAYER_BOUNDS,
  obstacles: collisionObstacles,
  clearance: AVATAR_COLLISION_RADIUS
} as const;
