import type { AgentSnapshot } from "@token-floor/protocol";
import { describe, expect, it } from "vitest";
import type { MovingActor } from "./actorRuntime.js";
import { recoverBlockedIdleRoute } from "./idleRouteRecovery.js";

type TestIdleActor = MovingActor & {
  snapshot: AgentSnapshot;
  blockedMs: number;
  visit: number;
};

function blockedActor(): TestIdleActor {
  return {
    avatar: { container: { x: 416, y: 224 } },
    route: [{ x: 464, y: 224 }],
    waypoint: 0,
    moving: false,
    snapshot: { id: "idle-agent", status: "completed" } as AgentSnapshot,
    blockedMs: 0,
    visit: 0
  } as unknown as TestIdleActor;
}

describe("idle route recovery", () => {
  it("quickly replans a blocked completed agent through the valid lounge passage", () => {
    const actor = blockedActor();

    expect(recoverBlockedIdleRoute(actor, 349, [actor])).toBe(false);
    expect(recoverBlockedIdleRoute(actor, 1, [actor])).toBe(true);
    expect(actor.route[0]?.x).toBe(416);
    expect([256, 288]).toContain(actor.route[0]?.y);
    expect(actor.waypoint).toBe(0);
  });

  it("does not replan while the agent is still making progress", () => {
    const actor = blockedActor();
    actor.moving = true;
    actor.blockedMs = 300;

    expect(recoverBlockedIdleRoute(actor, 100, [actor])).toBe(false);
    expect(actor.blockedMs).toBe(0);
  });
});
