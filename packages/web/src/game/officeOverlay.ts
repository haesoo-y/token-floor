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
  status: AgentSnapshot["status"] | "npc" | "player" | "tool";
  tool?: "memos";
  width?: number;
  height?: number;
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

/** Projects a retained prop rectangle into the same overlay coordinate system as actors. */
export function projectWorldRect(
  rect: { x: number; y: number; width: number; height: number },
  camera: Phaser.Cameras.Scene2D.Camera
): { x: number; y: number; width: number; height: number } {
  return {
    x: (rect.x - camera.worldView.x) * camera.zoom,
    y: (rect.y - camera.worldView.y) * camera.zoom,
    width: rect.width * camera.zoom,
    height: rect.height * camera.zoom
  };
}
