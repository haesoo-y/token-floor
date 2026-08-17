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

/** Replans an idle agent that stopped against a changed wall or a congested entrance. */
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
  const unavailable = reservedRestSpots(actor, actors);
  replaceRoute(actor, routeToNextRestSpot(current, actor.snapshot.id, actor.visit, unavailable));
  actor.blockedMs = 0;
  return true;
}
