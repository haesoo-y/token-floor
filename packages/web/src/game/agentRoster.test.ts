import { describe, expect, it } from "vitest";
import type { AgentSnapshot } from "@token-floor/protocol";
import { assignAgentRoster } from "./agentRoster.js";

const agent = (id: string, provider: string, kind = "subagent") =>
  ({ id, provider, kind, status: "active" }) as AgentSnapshot;

describe("assignAgentRoster", () => {
  it("gives subagents unique physical slots across providers", () => {
    const roster = assignAgentRoster([
      agent("a", "codex"),
      agent("b", "claude-code"),
      agent("c", "codex")
    ]);
    expect(roster.map((entry) => entry.layoutSlot)).toEqual([0, 1, 2]);
  });

  it("cycles appearance slots independently for each provider and role", () => {
    const roster = assignAgentRoster([
      agent("a", "codex"),
      agent("b", "claude-code"),
      agent("c", "codex")
    ]);
    expect(roster.map((entry) => entry.appearanceSlot)).toEqual([0, 0, 1]);
  });
});
