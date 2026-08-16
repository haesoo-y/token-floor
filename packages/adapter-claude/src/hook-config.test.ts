import { describe, expect, it } from "vitest";
import { createClaudeHookSettings } from "./hook-config.js";

describe("createClaudeHookSettings", () => {
  it("uses short-lived localhost HTTP observers for each lifecycle event", () => {
    const settings = createClaudeHookSettings();
    expect(settings.hooks.SessionStart?.[0]?.hooks[0]).toEqual({
      type: "http",
      url: "http://127.0.0.1:4317/hooks/claude",
      timeout: 1
    });
    expect(settings.hooks.SubagentStop).toBeDefined();
    expect(settings.hooks.PermissionRequest).toBeDefined();
  });
});
