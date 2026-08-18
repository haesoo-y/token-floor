import { afterEach, describe, expect, it, vi } from "vitest";

import { PlayerInput } from "./PlayerInput.js";

function createHarness(initiallyEditing = false) {
  let editing = initiallyEditing;
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
  const addKeys = vi.fn(() => keys);
  vi.stubGlobal("window", {
    addEventListener: (type: string, listener: (event: KeyboardEvent) => void) =>
      listeners.set(type, listener),
    removeEventListener: (type: string) => listeners.delete(type)
  });
  vi.stubGlobal("document", {
    activeElement: { matches: () => editing }
  });
  const scene = {
    input: {
      keyboard: {
        enabled: true,
        addKeys
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
  return {
    input: new PlayerInput(scene as never),
    keys,
    listeners,
    focus,
    addKeys,
    setEditing: (value: boolean) => {
      editing = value;
    }
  };
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
  it("owns arrow keys outside text entry and handles repeated keydown idempotently", () => {
    const { input, keys, listeners } = createHarness();
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

  it("leaves WASD and arrow keys with the focused text editor", () => {
    const { input, keys, listeners, addKeys } = createHarness(true);
    const event = arrowEvent("ArrowDown");
    keys.w.isDown = true;
    keys.right.isDown = true;
    listeners.get("keydown")!(event);

    expect(input.read()).toEqual({ x: 0, y: 0 });
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.stopPropagation).not.toHaveBeenCalled();
    expect(keys.down.onDown).not.toHaveBeenCalled();
    expect(keys.right.reset).toHaveBeenCalledOnce();
    expect(addKeys).toHaveBeenCalledWith(expect.any(Object), false);
  });

  it("uses Phaser arrow state while a non-editable panel control owns focus", () => {
    const { input, keys, setEditing } = createHarness(true);
    setEditing(false);
    keys.right.isDown = true;

    expect(input.read()).toEqual({ x: 1, y: 0 });
  });
});
