import { afterEach, describe, expect, it, vi } from "vitest";

import { PlayerInput } from "./PlayerInput.js";

function createHarness(activeElementMatches = false) {
  const listeners = new Map<string, (event: KeyboardEvent) => void>();
  const focus = vi.fn();
  const key = () => {
    const state = {
      isDown: false,
      onDown: vi.fn(() => {
        state.isDown = true;
      }),
      onUp: vi.fn(() => {
        state.isDown = false;
      }),
      reset: vi.fn(() => {
        state.isDown = false;
      })
    };
    return state;
  };
  const keys = {
    up: key(),
    down: key(),
    left: key(),
    right: key(),
    w: key(),
    a: key(),
    s: key(),
    d: key()
  };
  vi.stubGlobal("window", {
    addEventListener: (type: string, listener: (event: KeyboardEvent) => void) =>
      listeners.set(type, listener),
    removeEventListener: (type: string) => listeners.delete(type)
  });
  vi.stubGlobal("document", {
    activeElement: { matches: () => activeElementMatches }
  });
  const scene = {
    input: {
      keyboard: {
        enabled: true,
        addKeys: () => keys
      }
    },
    game: {
      canvas: {
        tabIndex: -1,
        focus,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }
    }
  };
  return { input: new PlayerInput(scene as never), keys, listeners, focus };
}

function arrowEvent(key: string) {
  return {
    key,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn()
  } as unknown as KeyboardEvent;
}

afterEach(() => vi.unstubAllGlobals());

describe("PlayerInput", () => {
  it("owns arrow keys globally and handles repeated keydown idempotently", () => {
    const { input, keys, listeners } = createHarness(true);
    const down = listeners.get("keydown")!;
    const up = listeners.get("keyup")!;
    const event = arrowEvent("ArrowLeft");

    down(event);
    down(event);

    expect(input.read()).toEqual({ x: -1, y: 0 });
    expect(event.preventDefault).toHaveBeenCalledTimes(2);
    expect(event.stopPropagation).toHaveBeenCalledTimes(2);
    expect(keys.left.onDown).toHaveBeenCalledTimes(2);

    up(event);
    expect(keys.left.onUp).toHaveBeenCalledOnce();
    expect(input.read()).toEqual({ x: 0, y: 0 });
  });

  it("keeps arrows active but ignores WASD while editing text", () => {
    const { input, keys, listeners } = createHarness(true);
    keys.w.isDown = true;
    listeners.get("keydown")!(arrowEvent("ArrowDown"));

    expect(input.read()).toEqual({ x: 0, y: 1 });
  });

  it("uses Phaser arrow state even while a panel control owns focus", () => {
    const { input, keys } = createHarness(true);
    keys.right.isDown = true;

    expect(input.read()).toEqual({ x: 1, y: 0 });
  });
});
