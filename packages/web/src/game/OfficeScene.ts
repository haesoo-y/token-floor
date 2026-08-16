import Phaser from "phaser";
import type { AgentSnapshot } from "@token-floor/protocol";
import { framesForPlayer, framesForProvider, type AvatarPreset } from "../lib/avatar.js";
import { resolveMovement } from "../lib/movement.js";
import { OFFICE_PIXEL_ZOOM } from "../lib/pixelRendering.js";

const spots = [
  { x: 335, y: 170 },
  { x: 280, y: 280 },
  { x: 430, y: 340 },
  { x: 120, y: 210 },
  { x: 520, y: 170 },
  { x: 580, y: 390 }
];

const obstacles = [
  { x: 250, y: 105, width: 190, height: 125 },
  { x: 270, y: 300, width: 155, height: 85 },
  { x: 490, y: 325, width: 160, height: 140 }
];

interface AvatarParts {
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Sprite;
  hair: Phaser.GameObjects.Sprite;
  bubble?: Phaser.GameObjects.Text;
  status?: Phaser.GameObjects.Arc;
}

/**
 * Owns the imperative office world while exposing a small synchronization boundary to React.
 */
export class OfficeScene extends Phaser.Scene {
  private readonly selectAgent: (id: string) => void;
  private readonly agentSprites = new Map<string, AvatarParts>();
  private pendingAgents: Record<string, AgentSnapshot> = {};
  private player?: AvatarParts;
  private keys: Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key> | undefined;
  private playerPreset: AvatarPreset = "rose";
  private ready = false;

  constructor(selectAgent: (id: string) => void) {
    super("office");
    this.selectAgent = selectAgent;
  }

  preload(): void {
    this.load.image("office", "/vendor/metrocity/Interior/Demo/Image%20Sequence_002_0000.png");
    this.load.spritesheet("suit", "/vendor/metrocity/MetroCity%202.0/Suit.png", {
      frameWidth: 32,
      frameHeight: 32
    });
    this.load.spritesheet("suit1", "/vendor/metrocity/MetroCity%202.0/Suit1.png", {
      frameWidth: 32,
      frameHeight: 32
    });
    this.load.spritesheet("hair", "/vendor/metrocity/MetroCity%202.0/Hair.png", {
      frameWidth: 32,
      frameHeight: 32
    });
  }

  create(): void {
    this.textures.get("office").setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.add.image(0, 0, "office").setOrigin(0);
    this.cameras.main.setBounds(0, 0, 680, 503).setZoom(OFFICE_PIXEL_ZOOM).setRoundPixels(true);
    this.player = this.createAvatar(340, 445, framesForPlayer(this.playerPreset), false, "YOU");
    this.cameras.main.startFollow(this.player.container, true, 0.08, 0.08);
    this.keys = this.input.keyboard?.addKeys("W,A,S,D") as typeof this.keys;
    this.input.on("wheel", (_pointer: unknown, _objects: unknown, _dx: number, dy: number) => {
      const next = Phaser.Math.Clamp(this.cameras.main.zoom - dy * 0.001, 0.9, 1.8);
      this.cameras.main.setZoom(next);
    });
    this.ready = true;
    this.syncAgents(this.pendingAgents);
  }

  update(_time: number, delta: number): void {
    if (!this.player || !this.keys) return;
    const speed = 0.12 * delta;
    const dx = (this.keys.D.isDown ? speed : 0) - (this.keys.A.isDown ? speed : 0);
    const dy = (this.keys.S.isDown ? speed : 0) - (this.keys.W.isDown ? speed : 0);
    if (dx === 0 && dy === 0) return;
    const current = { x: this.player.container.x, y: this.player.container.y };
    const next = resolveMovement(
      current,
      { x: dx, y: dy },
      { minX: 24, maxX: 656, minY: 38, maxY: 479 },
      obstacles
    );
    this.player.container.setPosition(next.x, next.y);
  }

  /** Updates appearance in place so customization does not reset player position or camera state. */
  setPlayerPreset(preset: AvatarPreset): void {
    this.playerPreset = preset;
    if (!this.player) return;
    const frames = framesForPlayer(preset);
    this.player.body.setTexture(frames.texture, frames.bodyFrame);
    this.player.hair.setFrame(frames.hairFrame);
  }

  /** Reconciles normalized agent projections with long-lived Phaser display objects. */
  syncAgents(agents: Record<string, AgentSnapshot>): void {
    this.pendingAgents = agents;
    if (!this.ready) return;
    const ids = new Set(Object.keys(agents));
    for (const [id, avatar] of this.agentSprites) {
      if (!ids.has(id)) {
        avatar.container.destroy();
        this.agentSprites.delete(id);
      }
    }
    Object.values(agents).forEach((agent, index) => this.upsertAgent(agent, index));
  }

  private upsertAgent(agent: AgentSnapshot, index: number): void {
    const spot = spots[index % spots.length] ?? spots[0]!;
    let avatar = this.agentSprites.get(agent.id);
    if (!avatar) {
      avatar = this.createAvatar(
        spot.x,
        spot.y,
        framesForProvider(agent.provider, agent.id),
        agent.kind === "subagent",
        agent.provider === "codex" ? "CDX" : "CLD"
      );
      avatar.container
        .setSize(32, 40)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.selectAgent(agent.id));
      this.agentSprites.set(agent.id, avatar);
    }
    avatar.status?.setFillStyle(this.statusColor(agent.status));
    avatar.bubble?.setText(this.bubbleText(agent)).setVisible(agent.status !== "completed");
    avatar.container.setAlpha(agent.status === "completed" ? 0.72 : 1);
  }

  private createAvatar(
    x: number,
    y: number,
    frames: ReturnType<typeof framesForPlayer>,
    hat: boolean,
    label: string
  ): AvatarParts {
    const body = this.add.sprite(0, 0, frames.texture, frames.bodyFrame).setScale(1.35);
    const hair = this.add.sprite(0, 0, "hair", frames.hairFrame).setScale(1.35);
    const children: Phaser.GameObjects.GameObject[] = [body, hair];
    if (hat)
      children.push(
        this.add
          .rectangle(0, -19, 26, 6, frames.texture === "suit" ? 0xf28b3c : 0x4b8cff)
          .setStrokeStyle(2, 0x081018)
      );
    const tag = this.add.text(-17, 20, label, {
      fontFamily: "monospace",
      fontSize: "8px",
      color: "#eaf4fb",
      backgroundColor: "#081018cc",
      padding: { x: 3, y: 1 }
    });
    const status = this.add.circle(17, 17, 4, 0x64d6b2).setStrokeStyle(1, 0x081018);
    const bubble = this.add
      .text(-38, -48, "", {
        fontFamily: "monospace",
        fontSize: "8px",
        color: "#10202c",
        backgroundColor: "#f3f7f9",
        padding: { x: 4, y: 3 },
        wordWrap: { width: 92 }
      })
      .setDepth(4);
    children.push(tag, status, bubble);
    return {
      container: this.add.container(x, y, children).setDepth(y),
      body,
      hair,
      bubble,
      status
    };
  }

  private bubbleText(agent: AgentSnapshot): string {
    if (agent.status === "waiting") return "Permission needed";
    if (agent.status === "error") return "Something failed";
    return agent.activity?.summary ?? "Working…";
  }

  private statusColor(status: AgentSnapshot["status"]): number {
    return { active: 0x64d6b2, waiting: 0xf5c451, completed: 0x7d91a1, error: 0xf06b75 }[status];
  }
}
