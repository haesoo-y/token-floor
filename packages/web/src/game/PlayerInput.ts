import Phaser from "phaser";
import { resolveCardinalIntent, type InputAxis } from "./cardinalInput.js";

type DirectionKey = "up" | "down" | "left" | "right" | "w" | "a" | "s" | "d";

/** Owns keyboard capture and canvas focus for both WASD and arrow-key controls. */
export class PlayerInput {
  private readonly scene: Phaser.Scene;
  private readonly keys: Record<DirectionKey, Phaser.Input.Keyboard.Key>;
  private preferredAxis: InputAxis = "vertical";
  private readonly focusCanvas: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.keys = scene.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D
    }) as Record<DirectionKey, Phaser.Input.Keyboard.Key>;
    scene.input.keyboard?.addCapture([
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.W,
      Phaser.Input.Keyboard.KeyCodes.A,
      Phaser.Input.Keyboard.KeyCodes.S,
      Phaser.Input.Keyboard.KeyCodes.D
    ]);
    scene.game.canvas.tabIndex = 0;
    this.focusCanvas = () => scene.game.canvas.focus({ preventScroll: true });
    scene.game.canvas.addEventListener("pointerdown", this.focusCanvas);
    this.focusCanvas();
  }

  read() {
    if (this.justPressed(this.keys.left, this.keys.right, this.keys.a, this.keys.d)) {
      this.preferredAxis = "horizontal";
    }
    if (this.justPressed(this.keys.up, this.keys.down, this.keys.w, this.keys.s)) {
      this.preferredAxis = "vertical";
    }
    return resolveCardinalIntent(
      {
        up: this.keys.up.isDown || this.keys.w.isDown,
        down: this.keys.down.isDown || this.keys.s.isDown,
        left: this.keys.left.isDown || this.keys.a.isDown,
        right: this.keys.right.isDown || this.keys.d.isDown
      },
      this.preferredAxis
    );
  }

  destroy(): void {
    this.scene.game.canvas.removeEventListener("pointerdown", this.focusCanvas);
  }

  private justPressed(...keys: Phaser.Input.Keyboard.Key[]): boolean {
    return keys.some((key) => Phaser.Input.Keyboard.JustDown(key));
  }
}
