import Phaser from "phaser";
import { resolveCanvasDimension } from "../lib/pixelRendering.js";
import { OfficeScene } from "./OfficeScene.js";
import type { OfficeOverlayActor } from "./officeOverlay.js";

/** Creates the Phaser runtime that React mounts inside the office canvas host. */
export function createOfficeGame(
  parent: HTMLElement,
  selectAgent: (id: string) => void,
  selectUsage: (provider: "codex" | "claude-code") => void,
  publishOverlays: (actors: readonly OfficeOverlayActor[]) => void
) {
  const scene = new OfficeScene(selectAgent, selectUsage, publishOverlays);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: resolveCanvasDimension(parent.clientWidth),
    height: resolveCanvasDimension(parent.clientHeight),
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    backgroundColor: "#071019",
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.NO_CENTER },
    scene
  });
  return { game, scene };
}
