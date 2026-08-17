import type Phaser from "phaser";
import type { AgentSnapshot } from "@token-floor/protocol";
import { framesForProvider } from "../lib/avatar.js";
import type { Locale } from "../lib/i18n.js";
import { routeForAgent, routeToNextRestSpot } from "./actorMotion.js";
import { advanceActor, replaceRoute, routeComplete } from "./actorRuntime.js";
import { createAvatar } from "./avatarFactory.js";
import { projectAvatar, type OfficeOverlayActor } from "./officeOverlay.js";
import { spawnSpotForAgent, usageSpots } from "./officeLayout.js";
import { officeActorMotionConstraints } from "./officeCollision.js";
import { idlePhrase, scheduledSpeaker } from "./officeSpeech.js";
import { agentDestinationChanged, behaviorForAgent } from "./agentBehavior.js";
import { labelForAgent } from "./agentLabel.js";
import { assignAgentRoster } from "./agentRoster.js";
import { agentBubbleProps } from "./agentBubble.js";
import { nextUsagePatrolTarget, usagePatrolSpeed } from "./usagePatrol.js";
import { reservedRestSpots } from "./loungeOccupancy.js";
import { recoverBlockedIdleRoute } from "./idleRouteRecovery.js";
import { usageNpcOverlay } from "./usageNpcOverlay.js";
import type { AgentActor, UsageActor } from "./agentDirectorTypes.js";

/** Manages normalized agents and provider NPCs independently of camera and player input. */
export class AgentDirector {
  private readonly agents = new Map<string, AgentActor>();
  private readonly usageActors = new Map<string, UsageActor>();
  private locale: Locale = "en";
  private clock = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly selectAgent: (id: string) => void,
    private readonly selectUsage: (provider: "codex" | "claude-code") => void
  ) {
    this.createUsageActors();
  }

  syncAgents(agents: Record<string, AgentSnapshot>): void {
    const ids = new Set(Object.keys(agents));
    for (const [id, actor] of this.agents) {
      if (!ids.has(id)) {
        actor.avatar.container.destroy();
        this.agents.delete(id);
      }
    }
    assignAgentRoster(Object.values(agents)).forEach((entry) =>
      this.upsertAgent(entry.snapshot, entry.layoutSlot, entry.appearanceSlot, entry.spawnSlot)
    );
  }

  setLocale(locale: Locale): void {
    this.locale = locale;
  }

  update(time: number, delta: number): void {
    this.clock = time;
    for (const actor of this.agents.values()) this.updateAgent(actor, time, delta);
    for (const actor of this.usageActors.values()) this.updateUsageActor(actor, time, delta);
  }

  projectOverlays(camera: Phaser.Cameras.Scene2D.Camera): OfficeOverlayActor[] {
    const overlays: OfficeOverlayActor[] = [];
    const completedIds = [...this.agents.entries()]
      .filter(([, actor]) => actor.snapshot.status === "completed")
      .map(([id]) => id);
    const loungeSpeaker = scheduledSpeaker(completedIds, this.clock);
    for (const [id, actor] of this.agents) {
      const point = { x: actor.avatar.container.x, y: actor.avatar.container.y };
      overlays.push({
        id,
        ...projectAvatar(actor.avatar, camera),
        label: labelForAgent(actor.snapshot),
        ...agentBubbleProps(this.locale, actor.snapshot, point, id === loungeSpeaker, actor.phrase),
        provider: actor.snapshot.provider,
        status: actor.snapshot.status
      });
    }
    for (const actor of this.usageActors.values()) {
      overlays.push({
        ...usageNpcOverlay(actor.provider),
        ...projectAvatar(actor.avatar, camera)
      });
    }
    return overlays;
  }

  private updateAgent(actor: AgentActor, time: number, delta: number): void {
    advanceActor(actor, delta, time, actor.speed, officeActorMotionConstraints);
    if (!routeComplete(actor)) {
      actor.arrivedAt = undefined;
      recoverBlockedIdleRoute(actor, delta, this.agents.values());
      return;
    }
    if (actor.snapshot.status !== "completed") return;
    if (actor.arrivedAt === undefined) {
      actor.arrivedAt = time;
      actor.phrase = idlePhrase(this.locale, actor.phrase);
      return;
    }
    if (time - actor.arrivedAt < actor.pauseMs) return;
    actor.visit += 1;
    actor.phrase = idlePhrase(this.locale, actor.phrase);
    const current = { x: actor.avatar.container.x, y: actor.avatar.container.y };
    const unavailable = reservedRestSpots(actor, this.agents.values());
    replaceRoute(actor, routeToNextRestSpot(current, actor.snapshot.id, actor.visit, unavailable));
    actor.arrivedAt = undefined;
  }
  private updateUsageActor(actor: UsageActor, time: number, delta: number): void {
    const speed = usagePatrolSpeed(actor.provider);
    advanceActor(actor, delta, time, speed, officeActorMotionConstraints);
    if (!routeComplete(actor)) {
      actor.arrivedAt = undefined;
      return;
    }
    const target = nextUsagePatrolTarget(actor, time, usageSpots[actor.provider], actor.provider);
    if (target) replaceRoute(actor, [target]);
  }

  private upsertAgent(
    snapshot: AgentSnapshot,
    index: number,
    variant: number,
    spawnIndex: number
  ): void {
    let actor = this.agents.get(snapshot.id);
    if (!actor) {
      const frames = framesForProvider(
        snapshot.provider,
        snapshot.id,
        snapshot.kind === "subagent",
        false,
        variant
      );
      const spawn = spawnSpotForAgent(spawnIndex);
      const avatar = createAvatar(this.scene, spawn.x, spawn.y, frames);
      avatar.container
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.selectAgent(snapshot.id));
      actor = {
        avatar,
        route: [],
        waypoint: 0,
        moving: false,
        snapshot,
        index,
        visit: 0,
        blockedMs: 0,
        arrivedAt: undefined,
        ...behaviorForAgent(snapshot, index)
      };
      this.agents.set(snapshot.id, actor);
    }
    const destinationChanged = agentDestinationChanged(
      actor.snapshot,
      snapshot,
      actor.index,
      index
    );
    actor.snapshot = snapshot;
    actor.index = index;
    if (destinationChanged || actor.route.length === 0) {
      const current = { x: actor.avatar.container.x, y: actor.avatar.container.y };
      replaceRoute(actor, routeForAgent(snapshot, index, current));
    }
  }

  private createUsageActors(): void {
    for (const provider of ["codex", "claude-code"] as const) {
      const spot = usageSpots[provider];
      const avatar = createAvatar(
        this.scene,
        spot.x,
        spot.y,
        framesForProvider(provider, "npc", false, true)
      );
      avatar.container
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.selectUsage(provider));
      this.usageActors.set(provider, {
        provider,
        avatar,
        route: [],
        waypoint: 0,
        moving: false,
        visit: 0,
        arrivedAt: undefined
      });
    }
  }
}
