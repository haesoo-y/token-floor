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

/** Resolves one player movement step while preserving office bounds and obstacle collisions. */
export function resolveMovement(
  current: Point,
  delta: Point,
  bounds: MovementBounds,
  obstacles: readonly Rectangle[]
): Point {
  const next = {
    x: Math.min(bounds.maxX, Math.max(bounds.minX, current.x + delta.x)),
    y: Math.min(bounds.maxY, Math.max(bounds.minY, current.y + delta.y))
  };
  return obstacles.some((obstacle) => contains(obstacle, next)) ? current : next;
}
