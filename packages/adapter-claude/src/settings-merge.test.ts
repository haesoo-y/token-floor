import { describe, expect, it } from "vitest";
import { mergeClaudeHookSettings, removeClaudeHookSettings } from "./settings-merge.js";

describe("Claude settings merge", () => {
  it("preserves existing hooks and remains idempotent", () => {
    const original = {
      model: "opus",
      hooks: { SessionStart: [{ hooks: [{ type: "command", command: "existing" }] }] }
    };
    const merged = mergeClaudeHookSettings(original);
    const repeated = mergeClaudeHookSettings(merged);
    expect(repeated).toEqual(merged);
    expect((merged.hooks as Record<string, unknown[]>).SessionStart).toHaveLength(2);
    expect(merged.model).toBe("opus");
    expect(merged.statusLine).toMatchObject({
      type: "command",
      command: expect.stringContaining("/hooks/claude-usage")
    });
  });

  it("does not replace a user-owned status line", () => {
    const statusLine = { type: "command", command: "my-status", padding: 1 };
    expect(mergeClaudeHookSettings({ statusLine }).statusLine).toEqual(statusLine);
  });

  it("removes only Token Floor hook entries", () => {
    const original = { hooks: { Stop: [{ hooks: [{ type: "command", command: "existing" }] }] } };
    expect(removeClaudeHookSettings(mergeClaudeHookSettings(original))).toEqual(original);
  });

  it("upgrades the unsupported legacy HTTP SessionStart observer", () => {
    const url = "http://127.0.0.1:4317/hooks/claude";
    const legacy = {
      hooks: { SessionStart: [{ hooks: [{ type: "http", url, timeout: 1 }] }] }
    };
    const merged = mergeClaudeHookSettings(legacy);
    expect((merged.hooks as Record<string, Array<{ hooks: unknown[] }>>).SessionStart).toEqual([
      {
        hooks: [
          expect.objectContaining({
            type: "command",
            command: "sh",
            args: expect.arrayContaining([url])
          })
        ]
      }
    ]);
  });
});
