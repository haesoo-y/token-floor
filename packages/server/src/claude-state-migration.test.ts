import { describe, expect, it } from "vitest";
import type { OfficeState } from "@token-floor/protocol";
import type { NormalizedEvent } from "@token-floor/protocol";
import { removeUnobservedClaudeAgents } from "./claude-state-migration.js";

describe("removeUnobservedClaudeAgents", () => {
  it("removes legacy and no-work Claude actors", () => {
    const state = {
      agents: {
        legacy: { provider: "claude-code", kind: "subagent" },
        current: { provider: "claude-code", kind: "subagent", executionId: "agent-1" },
        codex: { provider: "codex", kind: "subagent" }
      },
      usageByProvider: {}
    } as unknown as OfficeState;
    const observed = [
      {
        provider: "claude-code",
        type: "agent.active",
        agent: { id: "current", kind: "subagent" }
      }
    ] as NormalizedEvent[];
    expect(Object.keys(removeUnobservedClaudeAgents(state, observed).agents)).toEqual([
      "current",
      "codex"
    ]);
  });
});
