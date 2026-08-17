import type Phaser from "phaser";
import { resolveCardinalIntent, type InputAxis } from "./cardinalInput.js";
import { axisForDirection, directionForArrowKey, type ArrowDirection } from "./playerKeyboard.js";

type DirectionKey = "up" | "down" | "left" | "right" | "w" | "a" | "s" | "d";

/** Owns keyboard capture and canvas focus for both WASD and arrow-key controls. */
export class PlayerInput {
  private readonly scene: Phaser.Scene;
  private readonly keys: Record<DirectionKey, Phaser.Input.Keyboard.Key>;
  private preferredAxis: InputAxis = "vertical";
  private wasHorizontalDown = false;
  private wasVerticalDown = false;
  private readonly arrows = new Set<ArrowDirection>();
  private readonly focusCanvas: () => void;
  private readonly handleArrowDown: (event: KeyboardEvent) => void;
  private readonly handleArrowUp: (event: KeyboardEvent) => void;
  private readonly clearArrows: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.keys = scene.input.keyboard!.addKeys({
      up: "UP",
      down: "DOWN",
      left: "LEFT",
      right: "RIGHT",
      w: "W",
      a: "A",
      s: "S",
      d: "D"
    }) as Record<DirectionKey, Phaser.Input.Keyboard.Key>;
    scene.game.canvas.tabIndex = 0;
    this.focusCanvas = () => scene.game.canvas.focus({ preventScroll: true });
    scene.game.canvas.addEventListener("pointerdown", this.focusCanvas);
    this.handleArrowDown = (event) => this.updateArrow(event, true);
    this.handleArrowUp = (event) => this.updateArrow(event, false);
    this.clearArrows = () => {
      this.arrows.clear();
      for (const direction of ["up", "down", "left", "right"] as const) {
        this.keys[direction].reset();
      }
    };
    window.addEventListener("keydown", this.handleArrowDown, true);
    window.addEventListener("keyup", this.handleArrowUp, true);
    window.addEventListener("blur", this.clearArrows);
    this.focusCanvas();
  }

  read() {
    const acceptsText = document.activeElement?.matches(
      "input, textarea, [contenteditable='true']"
    );
    const horizontalDown =
      this.arrows.has("left") ||
      this.arrows.has("right") ||
      this.keys.left.isDown ||
      this.keys.right.isDown ||
      (!acceptsText && (this.keys.a.isDown || this.keys.d.isDown));
    const verticalDown =
      this.arrows.has("up") ||
      this.arrows.has("down") ||
      this.keys.up.isDown ||
      this.keys.down.isDown ||
      (!acceptsText && (this.keys.w.isDown || this.keys.s.isDown));
    if (horizontalDown && !this.wasHorizontalDown) {
      this.preferredAxis = "horizontal";
    }
    if (verticalDown && !this.wasVerticalDown) {
      this.preferredAxis = "vertical";
    }
    this.wasHorizontalDown = horizontalDown;
    this.wasVerticalDown = verticalDown;
    return resolveCardinalIntent(
      {
        up: this.arrows.has("up") || this.keys.up.isDown || (!acceptsText && this.keys.w.isDown),
        down:
          this.arrows.has("down") || this.keys.down.isDown || (!acceptsText && this.keys.s.isDown),
        left:
          this.arrows.has("left") || this.keys.left.isDown || (!acceptsText && this.keys.a.isDown),
        right:
          this.arrows.has("right") || this.keys.right.isDown || (!acceptsText && this.keys.d.isDown)
      },
      this.preferredAxis
    );
  }

  destroy(): void {
    this.scene.game.canvas.removeEventListener("pointerdown", this.focusCanvas);
    window.removeEventListener("keydown", this.handleArrowDown, true);
    window.removeEventListener("keyup", this.handleArrowUp, true);
    window.removeEventListener("blur", this.clearArrows);
  }

  private updateArrow(event: KeyboardEvent, pressed: boolean): void {
    const direction = directionForArrowKey(event.key);
    if (!direction) return;
    event.preventDefault();
    // Stop focused controls from receiving arrow navigation. Phaser ignores default-prevented
    // events, so bridge the captured event into its Key state explicitly before stopping it.
    if (pressed) this.keys[direction].onDown(event);
    else this.keys[direction].onUp(event);
    event.stopPropagation();
    if (pressed) {
      this.arrows.add(direction);
      this.preferredAxis = axisForDirection(direction);
    } else {
      this.arrows.delete(direction);
    }
  }
}
