import type Phaser from "phaser";
import type { AvatarFrames } from "../lib/avatar.js";

export type Facing = "down" | "left" | "right" | "up";

export interface AvatarParts {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite;
  frames: AvatarFrames;
  facing: Facing;
}

export const AVATAR_FRAME_SIZE = 32;
export const AVATAR_SCALE = 1;
export const AVATAR_WORLD_SIZE = AVATAR_FRAME_SIZE * AVATAR_SCALE;
// A compact body footprint keeps 32-pixel passages usable without allowing center-point clipping.
export const AVATAR_COLLISION_RADIUS = AVATAR_WORLD_SIZE / 4;

// The composed production sheets place the right-facing group before the back-facing group.
const directionOffset: Record<Facing, number> = { down: 0, left: 18, right: 6, up: 12 };

export function avatarFrame(facing: Facing, step: number): number {
  return directionOffset[facing] + (Math.abs(step) % 6);
}

/** Creates a character from one coherent sheet so the face and body cannot desynchronize. */
export function createAvatar(
  scene: Phaser.Scene,
  x: number,
  y: number,
  frames: AvatarFrames
): AvatarParts {
  const sprite = scene.add.sprite(0, 0, frames.texture, 0).setScale(AVATAR_SCALE);
  return {
    container: scene.add
      .container(x, y, [sprite])
      .setSize(AVATAR_WORLD_SIZE, AVATAR_WORLD_SIZE)
      .setDepth(y),
    sprite,
    frames,
    facing: "down"
  };
}

/** Keeps direction changes cardinal and wraps any walk step to the authored 3-frame cycle. */
export function setAvatarFrame(avatar: AvatarParts, facing: Facing, step: number): void {
  avatar.facing = facing;
  avatar.sprite.setFrame(avatarFrame(facing, step));
}

export function updateAvatarFrames(avatar: AvatarParts, frames: AvatarFrames): void {
  avatar.frames = frames;
  avatar.sprite.setTexture(frames.texture);
  setAvatarFrame(avatar, avatar.facing, 0);
}
