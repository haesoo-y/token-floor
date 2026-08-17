import Phaser from "phaser";
import type { AgentSnapshot } from "@token-floor/protocol";
import { framesForPlayer, type AvatarPreset } from "../lib/avatar.js";
import type { Locale } from "../lib/i18n.js";
import { resolveMovement } from "../lib/movement.js";
import { resolveOfficeZoom } from "../lib/pixelRendering.js";
import { AgentDirector } from "./AgentDirector.js";
import { officeAssets } from "../lib/assets.js";
import {
  createAvatar,
  setAvatarFrame,
  updateAvatarFrames,
  type AvatarParts,
  type Facing
} from "./avatarFactory.js";
import type { OfficeOverlayActor } from "./officeOverlay.js";
import { OFFICE_HEIGHT, OFFICE_WIDTH, PLAYER_START } from "./officeLayout.js";
import { officeActorMotionConstraints } from "./officeCollision.js";
import { createOfficeWorld } from "./OfficeWorld.js";
import { projectAvatar } from "./officeOverlay.js";
import { PlayerInput } from "./PlayerInput.js";
import { PLAYER_MOVE_PER_MS } from "./movementTuning.js";

type PublishOverlays = (actors: readonly OfficeOverlayActor[]) => void;

/** Owns camera and player input while delegating autonomous actors to the director. */
export class OfficeScene extends Phaser.Scene {
  private readonly selectAgent: (id: string) => void;
  private readonly publishOverlays: PublishOverlays;
  private readonly selectUsage: (provider: "codex" | "claude-code") => void;
  private pendingAgents: Record<string, AgentSnapshot> = {};
  private player: AvatarParts | undefined;
  private director: AgentDirector | undefined;
  private playerInput: PlayerInput | undefined;
  private playerPreset: AvatarPreset = "onyx";
  private locale: Locale = "en";
  private lastOverlayAt = 0;

  constructor(
    selectAgent: (id: string) => void,
    selectUsage: (provider: "codex" | "claude-code") => void,
    publishOverlays: PublishOverlays
  ) {
    super("office");
    this.selectAgent = selectAgent;
    this.selectUsage = selectUsage;
    this.publishOverlays = publishOverlays;
  }

  preload(): void {
    for (const asset of [...officeAssets.floors, ...officeAssets.images]) {
      this.load.image(asset.key, asset.url);
    }
    for (const asset of officeAssets.sheets) {
      this.load.spritesheet(asset.key, asset.url, {
        frameWidth: asset.frameWidth,
        frameHeight: asset.frameHeight
      });
    }
  }

  create(): void {
    createOfficeWorld(this);
    this.player = createAvatar(
      this,
      PLAYER_START.x,
      PLAYER_START.y,
      framesForPlayer(this.playerPreset)
    );
    this.director = new AgentDirector(this, this.selectAgent, this.selectUsage);
    this.director.syncAgents(this.pendingAgents);
    this.director.setLocale(this.locale);
    this.cameras.main.setBounds(0, 0, OFFICE_WIDTH, OFFICE_HEIGHT).setRoundPixels(true);
    this.resizeCamera();
    this.cameras.main.startFollow(this.player.container, true, 0.09, 0.09);
    this.playerInput = new PlayerInput(this);
    this.input.on("wheel", this.handleWheel, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.resizeCamera, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off("wheel", this.handleWheel, this);
      this.scale.off(Phaser.Scale.Events.RESIZE, this.resizeCamera, this);
      this.playerInput?.destroy();
    });
  }

  update(time: number, delta: number): void {
    this.updatePlayer(time, delta);
    this.director?.update(time, delta);
    if (time - this.lastOverlayAt > 66) {
      this.publishActorOverlays();
      this.lastOverlayAt = time;
    }
  }

  setPlayerPreset(preset: AvatarPreset): void {
    this.playerPreset = preset;
    if (this.player) updateAvatarFrames(this.player, framesForPlayer(preset));
  }

  syncAgents(agents: Record<string, AgentSnapshot>): void {
    this.pendingAgents = agents;
    this.director?.syncAgents(agents);
  }

  setLocale(locale: Locale): void {
    this.locale = locale;
    this.director?.setLocale(locale);
  }

  private updatePlayer(time: number, delta: number): void {
    if (!this.player || !this.playerInput) return;
    const intent = this.playerInput.read();
    if (intent.x === 0 && intent.y === 0) {
      setAvatarFrame(this.player, this.player.facing, 0);
      return;
    }
    const movement = {
      x: intent.x * PLAYER_MOVE_PER_MS * delta,
      y: intent.y * PLAYER_MOVE_PER_MS * delta
    };
    const current = { x: this.player.container.x, y: this.player.container.y };
    const next = resolveMovement(
      current,
      movement,
      officeActorMotionConstraints.bounds,
      officeActorMotionConstraints.obstacles,
      officeActorMotionConstraints.clearance
    );
    this.player.container.setPosition(next.x, next.y).setDepth(next.y);
    setAvatarFrame(this.player, facingForMovement(movement), Math.floor(time / 95) % 6);
  }

  private publishActorOverlays(): void {
    if (!this.player || !this.director) return;
    const player: OfficeOverlayActor = {
      id: "player",
      ...projectAvatar(this.player, this.cameras.main),
      label: "YOU",
      provider: "player",
      status: "player"
    };
    this.publishOverlays([player, ...this.director.projectOverlays(this.cameras.main)]);
  }

  private handleWheel(
    _pointer: Phaser.Input.Pointer,
    _objects: Phaser.GameObjects.GameObject[],
    _dx: number,
    dy: number
  ): void {
    const minimum = resolveOfficeZoom(
      this.scale.width,
      this.scale.height,
      OFFICE_WIDTH,
      OFFICE_HEIGHT
    );
    const next = Phaser.Math.Clamp(this.cameras.main.zoom - Math.sign(dy), minimum, 3);
    this.cameras.main.setZoom(next);
  }

  private resizeCamera(): void {
    const zoom = resolveOfficeZoom(
      this.scale.width,
      this.scale.height,
      OFFICE_WIDTH,
      OFFICE_HEIGHT
    );
    this.cameras.main.setZoom(zoom);
  }
}

function facingForMovement(movement: { x: number; y: number }): Facing {
  if (Math.abs(movement.x) > Math.abs(movement.y)) return movement.x < 0 ? "left" : "right";
  return movement.y < 0 ? "up" : "down";
}
