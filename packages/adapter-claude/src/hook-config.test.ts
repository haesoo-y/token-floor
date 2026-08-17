import { describe, expect, it } from "vitest";
import { createClaudeHookSettings, createClaudeStatusLineSetting } from "./hook-config.js";

describe("createClaudeHookSettings", () => {
  it("uses non-blocking command observers for Desktop and terminal sessions", () => {
    const settings = createClaudeHookSettings();
    expect(settings.hooks.SessionStart?.[0]?.hooks[0]).toMatchObject({
      type: "command",
      command: "sh",
      args: expect.arrayContaining(["http://127.0.0.1:4317/hooks/claude"])
    });
    expect(settings.hooks.SubagentStart?.[0]?.hooks[0]).toMatchObject({
      type: "command",
      args: expect.arrayContaining(["http://127.0.0.1:4317/hooks/claude"])
    });
    expect(settings.hooks.SubagentStop).toBeDefined();
    expect(settings.hooks.PermissionRequest).toBeDefined();
  });

  it("posts CLI status metadata without starting another Claude process", () => {
    expect(createClaudeStatusLineSetting()).toMatchObject({
      type: "command",
      command: expect.stringContaining("http://127.0.0.1:4317/hooks/claude-usage")
    });
  });
});
