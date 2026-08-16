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
  });

  it("removes only Token Floor hook entries", () => {
    const original = { hooks: { Stop: [{ hooks: [{ type: "command", command: "existing" }] }] } };
    expect(removeClaudeHookSettings(mergeClaudeHookSettings(original))).toEqual(original);
  });
});
