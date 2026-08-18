import type { InputAxis } from "./cardinalInput.js";

export type ArrowDirection = "up" | "down" | "left" | "right";

/** Returns whether the focused element currently owns text-entry keystrokes. */
export function isTextEntryElement(element: Element | null): boolean {
  return Boolean(
    element?.matches("input, textarea, [contenteditable]:not([contenteditable='false'])")
  );
}

export function directionForArrowKey(key: string): ArrowDirection | undefined {
  if (key === "ArrowUp") return "up";
  if (key === "ArrowDown") return "down";
  if (key === "ArrowLeft") return "left";
  if (key === "ArrowRight") return "right";
  return undefined;
}

export function axisForDirection(direction: ArrowDirection): InputAxis {
  return direction === "left" || direction === "right" ? "horizontal" : "vertical";
}
