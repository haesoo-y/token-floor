import type { AgentSnapshot } from "@token-floor/protocol";
import { replaceRoute, type MovingActor } from "./actorRuntime.js";
import { routeToNextRestSpot } from "./actorMotion.js";
import { reservedRestSpots } from "./loungeOccupancy.js";

interface RecoverableIdleActor extends MovingActor {
  snapshot: AgentSnapshot;
  blockedMs: number;
  visit: number;
}

const BLOCKED_ROUTE_RECOVERY_MS = 350;

/** Replans a completed agent stalled by a static layout change. */
export function recoverBlockedIdleRoute(
  actor: RecoverableIdleActor,
  delta: number,
  actors: Iterable<RecoverableIdleActor>
): boolean {
  if (actor.snapshot.status !== "completed" || actor.moving) {
    actor.blockedMs = 0;
    return false;
  }
  actor.blockedMs += delta;
  if (actor.blockedMs < BLOCKED_ROUTE_RECOVERY_MS) return false;

  const current = { x: actor.avatar.container.x, y: actor.avatar.container.y };
  const actorList = [...actors];
  const unavailable = reservedRestSpots(actor, actorList);
  replaceRoute(actor, routeToNextRestSpot(current, actor.snapshot.id, actor.visit, unavailable));
  actor.blockedMs = 0;
  return true;
}
