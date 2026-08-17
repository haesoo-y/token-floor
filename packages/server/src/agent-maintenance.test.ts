import { afterEach, describe, expect, it, vi } from "vitest";
import { applyEvent, createOfficeState } from "@token-floor/protocol";
import { startAgentMaintenance } from "./agent-maintenance.js";

afterEach(() => vi.useRealTimers());

describe("startAgentMaintenance", () => {
  it("expires silent Codex agents without a Claude collector", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-17T00:06:00.000Z"));
    let state = applyEvent(createOfficeState(), {
      schemaVersion: 1,
      eventId: "codex-active",
      occurredAt: "2026-08-17T00:00:00.000Z",
      provider: "codex",
      sessionId: "session",
      type: "agent.active",
      agent: { id: "codex:thread", kind: "main", executionId: "thread" },
      project: { id: "project", label: "project" },
      activity: { summary: "Working" }
    });
    const stop = startAgentMaintenance({
      getState: () => state,
      setState: (next) => {
        state = next;
      },
      broadcastSnapshot: () => undefined,
      intervalMs: 1
    });
    vi.advanceTimersByTime(1);
    expect(state.agents["codex:thread"]?.status).toBe("completed");
    stop();
  });
});
