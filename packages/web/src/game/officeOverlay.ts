import type { AgentSnapshot } from "@token-floor/protocol";
import type Phaser from "phaser";
import type { AvatarParts } from "./avatarFactory.js";

export interface OfficeOverlayActor {
  id: string;
  x: number;
  y: number;
  label: string;
  bubble?: string;
  provider: string;
  status: AgentSnapshot["status"] | "npc" | "player";
}

/** Projects a world-space avatar anchor into the fixed React overlay layer. */
export function projectAvatar(
  avatar: AvatarParts,
  camera: Phaser.Cameras.Scene2D.Camera
): { x: number; y: number } {
  return {
    x: (avatar.container.x - camera.worldView.x) * camera.zoom,
    y: (avatar.container.y - camera.worldView.y) * camera.zoom
  };
}
