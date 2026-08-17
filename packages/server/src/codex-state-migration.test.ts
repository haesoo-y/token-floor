import { describe, expect, it } from "vitest";
import { applyEvent, createOfficeState } from "@token-floor/protocol";
import { removeLegacyCodexAgents } from "./codex-state-migration.js";

const base = {
  schemaVersion: 1 as const,
  occurredAt: "2026-08-17T00:00:00.000Z",
  provider: "codex",
  sessionId: "session",
  type: "agent.started" as const,
  project: { id: "project", label: "project" }
};

describe("removeLegacyCodexAgents", () => {
  it("keeps execution-backed Codex actors and removes simulated identities", () => {
    let state = applyEvent(createOfficeState(), {
      ...base,
      eventId: "legacy",
      agent: { id: "codex-main", kind: "main" }
    });
    state = applyEvent(state, {
      ...base,
      eventId: "real",
      agent: { id: "codex:thread", kind: "main", executionId: "thread" }
    });
    expect(Object.keys(removeLegacyCodexAgents(state).agents)).toEqual(["codex:thread"]);
  });
});
