export interface Point {
  x: number;
  y: number;
}

export interface Rectangle extends Point {
  width: number;
  height: number;
}

export interface MovementBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function contains(rectangle: Rectangle, point: Point): boolean {
  return (
    point.x >= rectangle.x &&
    point.x <= rectangle.x + rectangle.width &&
    point.y >= rectangle.y &&
    point.y <= rectangle.y + rectangle.height
  );
}

function overlapsWithClearance(rectangle: Rectangle, point: Point, clearance: number): boolean {
  if (clearance === 0) return contains(rectangle, point);
  return (
    point.x + clearance > rectangle.x &&
    point.x - clearance < rectangle.x + rectangle.width &&
    point.y + clearance > rectangle.y &&
    point.y - clearance < rectangle.y + rectangle.height
  );
}

function overlapDepth(rectangle: Rectangle, point: Point, clearance: number): number {
  if (!overlapsWithClearance(rectangle, point, clearance)) return 0;

  const left = rectangle.x - clearance;
  const right = rectangle.x + rectangle.width + clearance;
  const top = rectangle.y - clearance;
  const bottom = rectangle.y + rectangle.height + clearance;
  return Math.max(
    Number.EPSILON,
    Math.min(point.x - left, right - point.x, point.y - top, bottom - point.y)
  );
}

function collisionDepth(obstacles: readonly Rectangle[], point: Point, clearance: number): number {
  return obstacles.reduce((total, obstacle) => total + overlapDepth(obstacle, point, clearance), 0);
}

/** Resolves one player movement step while preserving office bounds and obstacle collisions. */
export function resolveMovement(
  current: Point,
  delta: Point,
  bounds: MovementBounds,
  obstacles: readonly Rectangle[],
  clearance = 0
): Point {
  const next = {
    x: Math.min(bounds.maxX - clearance, Math.max(bounds.minX + clearance, current.x + delta.x)),
    y: Math.min(bounds.maxY - clearance, Math.max(bounds.minY + clearance, current.y + delta.y))
  };
  const nextCollisionDepth = collisionDepth(obstacles, next, clearance);
  if (nextCollisionDepth === 0) return next;

  // Layout hot reloads and narrow corners can leave an actor a fraction inside a wall.
  // Permit only movement that reduces penetration so the actor can escape without crossing walls.
  const currentCollisionDepth = collisionDepth(obstacles, current, clearance);
  const entersAnotherObstacle = obstacles.some(
    (obstacle) =>
      overlapsWithClearance(obstacle, next, clearance) &&
      !overlapsWithClearance(obstacle, current, clearance)
  );
  return currentCollisionDepth > 0 &&
    nextCollisionDepth < currentCollisionDepth &&
    !entersAnotherObstacle
    ? next
    : current;
}
