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
    expect(new Set(roster.map((entry) => entry.layoutSlot)).size).toBe(3);
  });

  it("cycles appearance slots independently for each provider and role", () => {
    const roster = assignAgentRoster([
      agent("a", "codex"),
      agent("b", "claude-code"),
      agent("c", "codex")
    ]);
    expect(roster[0]?.appearanceSlot).not.toBe(roster[2]?.appearanceSlot);
    expect(roster[1]?.appearanceSlot).toBeDefined();
  });

  it("keeps spawn slots unique across status and role pools", () => {
    const roster = assignAgentRoster([
      agent("a", "codex"),
      { ...agent("b", "codex", "main"), status: "completed" },
      agent("c", "claude-code", "main")
    ]);
    expect(new Set(roster.map((entry) => entry.spawnSlot)).size).toBe(3);
  });

  it("keeps identity slots stable when provider input order changes", () => {
    const agents = [agent("a", "codex"), agent("b", "claude-code"), agent("c", "codex")];
    const first = Object.fromEntries(
      assignAgentRoster(agents).map((entry) => [entry.snapshot.id, entry.layoutSlot])
    );
    const reordered = Object.fromEntries(
      assignAgentRoster([...agents].reverse()).map((entry) => [entry.snapshot.id, entry.layoutSlot])
    );
    expect(reordered).toEqual(first);
  });
});
