import { describe, expect, it } from "vitest";
import { usageNpcOverlay } from "./AgentDirector.js";

describe("usage NPC overlays", () => {
  it.each(["codex", "claude-code"] as const)("keeps %s free of speech bubbles", (provider) => {
    const overlay = usageNpcOverlay(provider);
    expect(overlay.status).toBe("npc");
    expect(overlay).not.toHaveProperty("bubble");
  });
});
