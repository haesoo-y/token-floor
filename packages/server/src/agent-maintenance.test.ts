import { afterEach, describe, expect, it, vi } from "vitest";
import { applyEvent, createOfficeState } from "@token-floor/protocol";
import { startAgentMaintenance } from "./agent-maintenance.js";

afterEach(() => vi.useRealTimers());

describe("startAgentMaintenance", () => {
  it("reconciles recovered agents before the first interval elapses", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-17T02:00:00.000Z"));
    let state = applyEvent(createOfficeState(), {
      schemaVersion: 1,
      eventId: "old-completed",
      occurredAt: "2026-08-17T00:00:00.000Z",
      provider: "codex",
      sessionId: "old-session",
      type: "agent.completed",
      agent: { id: "codex:old-session", kind: "main", executionId: "old-session" },
      project: { id: "project", label: "project" },
      inferred: false
    });

    const stop = startAgentMaintenance({
      getState: () => state,
      setState: (next) => {
        state = next;
      },
      broadcastSnapshot: () => undefined
    });

    expect(state.agents["codex:old-session"]).toBeUndefined();
    expect(state.recentEvents.map((event) => event.eventId)).toContain("old-completed");
    stop();
  });

  it("immediately expires and prunes a recovered stale active agent", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-17T02:00:00.000Z"));
    let state = applyEvent(createOfficeState(), {
      schemaVersion: 1,
      eventId: "old-active",
      occurredAt: "2026-08-17T00:00:00.000Z",
      provider: "codex",
      sessionId: "old-session",
      type: "agent.active",
      agent: { id: "codex:old-session", kind: "main", executionId: "old-session" },
      project: { id: "project", label: "project" },
      activity: { summary: "Working" }
    });

    const stop = startAgentMaintenance({
      getState: () => state,
      setState: (next) => {
        state = next;
      },
      broadcastSnapshot: () => undefined
    });

    expect(state.agents["codex:old-session"]).toBeUndefined();
    expect(state.recentEvents.map((event) => event.eventId)).toContain("old-active");
    stop();
  });

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

  it("measures completion timeout from the latest normalized heartbeat", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-17T00:06:00.000Z"));
    let state = createOfficeState();
    for (const [eventId, occurredAt] of [
      ["codex-active", "2026-08-17T00:00:00.000Z"],
      ["codex-heartbeat", "2026-08-17T00:04:30.000Z"]
    ]) {
      state = applyEvent(state, {
        schemaVersion: 1,
        eventId,
        occurredAt,
        provider: "codex",
        sessionId: "session",
        type: "agent.active",
        agent: { id: "codex:thread", kind: "main", executionId: "thread" },
        project: { id: "project", label: "project" },
        activity: { summary: "Working" }
      });
    }
    const stop = startAgentMaintenance({
      getState: () => state,
      setState: (next) => {
        state = next;
      },
      broadcastSnapshot: () => undefined,
      intervalMs: 1
    });

    vi.advanceTimersByTime(1);
    expect(state.agents["codex:thread"]?.status).toBe("active");
    vi.setSystemTime(new Date("2026-08-17T00:07:30.000Z"));
    vi.advanceTimersByTime(1);
    expect(state.agents["codex:thread"]?.status).toBe("completed");
    stop();
  });
});
