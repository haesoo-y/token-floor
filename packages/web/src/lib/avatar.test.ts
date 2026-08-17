import { describe, expect, it } from "vitest";
import {
  framesForPlayer,
  framesForProvider,
  framesForUsage,
  resolveAvatarPreset
} from "./avatar.js";

describe("MetroCity avatar assets", () => {
  it("uses provider-specific main variants", () => {
    expect(framesForProvider("codex", "a").texture).toMatch(/^mc-codex-main-[01]$/);
    expect(framesForProvider("claude-code", "b").texture).toMatch(/^mc-claude-main-[01]$/);
  });

  it("uses provider-capped subagent variants", () => {
    expect(framesForProvider("codex", "sub", true).texture).toMatch(/^mc-codex-sub-[01]$/);
    expect(framesForProvider("claude-code", "sub", true).texture).toMatch(/^mc-claude-sub-[01]$/);
  });

  it("supports deterministic roster slots without changing provider colors", () => {
    expect(framesForProvider("codex", "same", false, false, 0).texture).toBe("mc-codex-main-0");
    expect(framesForProvider("codex", "same", false, false, 1).texture).toBe("mc-codex-main-1");
    expect(framesForProvider("claude-code", "same", true, false, 3).texture).toBe(
      "mc-claude-sub-1"
    );
  });

  it("reserves one distinct NPC sheet per provider", () => {
    expect(framesForProvider("codex", "npc", false, true).texture).toBe("mc-codex-npc");
    expect(framesForProvider("claude-code", "npc", false, true).texture).toBe("mc-claude-npc");
    expect(framesForUsage("codex").texture).toBe("mc-codex-npc");
    expect(framesForUsage("claude-code").texture).toBe("mc-claude-npc");
  });

  it("maps every player preset to a MetroCity sheet", () => {
    expect(framesForPlayer("onyx").texture).toBe("mc-player-onyx");
    expect(framesForPlayer("raven").texture).toBe("mc-player-raven");
    expect(framesForPlayer("noir").texture).toBe("mc-player-noir");
    expect(resolveAvatarPreset("rose")).toBe("onyx");
  });
});
