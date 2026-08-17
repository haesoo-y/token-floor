import { describe, expect, it } from "vitest";
import type { AgentActiveEvent, AgentWaitingEvent } from "./model.js";
import {
  applyEvent,
  createOfficeState,
  DEFAULT_COMPLETION_TIMEOUT_MS,
  inferTimedOutCompletions,
  pruneCompletedAgents
} from "./state.js";

const activeEvent: AgentActiveEvent = {
  schemaVersion: 1,
  eventId: "event-1",
  occurredAt: "2026-08-16T00:00:00.000Z",
  provider: "codex",
  sessionId: "session-1",
  type: "agent.active",
  agent: { id: "agent-1", kind: "main" },
  project: { id: "project-1", label: "token-floor" },
  activity: { tool: "shell", summary: "Running tests" }
};

describe("office state reducer", () => {
  it("projects normalized activity into an agent snapshot", () => {
    const state = applyEvent(createOfficeState(), activeEvent);
    expect(state.agents["agent-1"]).toMatchObject({
      status: "active",
      provider: "codex",
      projectLabel: "token-floor"
    });
    expect(state.recentEvents).toEqual([activeEvent]);
  });

  it("stores chat messages idempotently and projects the latest assistant reply", () => {
    const active = applyEvent(createOfficeState(), activeEvent);
    const message = {
      ...activeEvent,
      eventId: "message-1",
      type: "agent.message" as const,
      message: { role: "assistant" as const, text: "Implemented the requested change." }
    };
    const state = applyEvent(active, message);

    expect(state.messages).toEqual([message]);
    expect(state.recentEvents).toEqual([activeEvent]);
    expect(state.agents["agent-1"]?.lastMessage).toEqual(message.message);
    expect(applyEvent(state, message)).toBe(state);

    const userMessage = {
      ...message,
      eventId: "message-2",
      message: { role: "user" as const, text: "Start the next change." }
    };
    const next = applyEvent(state, userMessage);
    expect(next.messages).toHaveLength(2);
    expect(next.agents["agent-1"]?.lastMessage).toBeUndefined();
  });

  it("keeps one hundred chat entries independently from the event log", () => {
    let state = applyEvent(createOfficeState(), activeEvent);
    for (let index = 0; index < 105; index += 1) {
      state = applyEvent(state, {
        ...activeEvent,
        eventId: `message-${index}`,
        occurredAt: new Date(Date.parse(activeEvent.occurredAt) + index + 1).toISOString(),
        type: "agent.message",
        message: { role: "assistant", text: `Message ${index}` }
      });
    }

    expect(state.messages).toHaveLength(100);
    expect(state.messages[0]?.eventId).toBe("message-104");
    expect(state.messages.at(-1)?.eventId).toBe("message-5");
    expect(state.recentEvents).toEqual([activeEvent]);
  });

  it("keeps one hundred idempotent event log entries for snapshot recovery", () => {
    let state = createOfficeState();
    for (let index = 0; index < 105; index += 1) {
      state = applyEvent(state, {
        ...activeEvent,
        eventId: `history-${index}`,
        occurredAt: new Date(Date.parse(activeEvent.occurredAt) + index).toISOString()
      });
    }

    expect(state.recentEvents).toHaveLength(100);
    expect(state.recentEvents[0]?.eventId).toBe("history-104");
    expect(applyEvent(state, state.recentEvents[0]!)).toEqual(state);
  });

  it("retains reusable actor execution metadata", () => {
    const state = applyEvent(createOfficeState(), {
      ...activeEvent,
      agent: {
        id: "claude:session-1:sub:0",
        kind: "subagent",
        parentId: "claude:session-1",
        executionId: "agent-7",
        role: "Explore"
      }
    });
    expect(state.agents["claude:session-1:sub:0"]).toMatchObject({
      executionId: "agent-7",
      role: "Explore"
    });
  });

  it("ignores events older than the current snapshot", () => {
    const current = applyEvent(createOfficeState(), activeEvent);
    const older = { ...activeEvent, eventId: "event-0", occurredAt: "2026-08-15T23:59:00.000Z" };
    expect(applyEvent(current, older)).toBe(current);
  });

  it("infers completion only for stale active agents", () => {
    const active = applyEvent(createOfficeState(), activeEvent);
    const now = new Date(Date.parse(activeEvent.occurredAt) + DEFAULT_COMPLETION_TIMEOUT_MS);
    expect(inferTimedOutCompletions(active, now).agents["agent-1"]).toMatchObject({
      status: "completed",
      inferredCompletion: true
    });

    const waitingEvent: AgentWaitingEvent = {
      ...activeEvent,
      eventId: "event-2",
      type: "agent.waiting",
      reason: "permission"
    };
    const waiting = applyEvent(active, waitingEvent);
    expect(inferTimedOutCompletions(waiting, now).agents["agent-1"]?.status).toBe("waiting");
    expect(waiting.agents["agent-1"]?.activity).toBeUndefined();
  });

  it("stores provider usage independently from agent state", () => {
    const state = applyEvent(createOfficeState(), {
      schemaVersion: 1,
      eventId: "usage-1",
      occurredAt: "2026-08-16T01:00:00.000Z",
      provider: "claude-code",
      sessionId: "account",
      type: "usage.updated",
      usage: {
        capability: "weekly-percentage",
        remainingPercent: 42,
        fiveHourRemainingPercent: 73
      }
    });
    expect(state.usageByProvider["claude-code"]).toEqual({
      capability: "weekly-percentage",
      remainingPercent: 42,
      fiveHourRemainingPercent: 73,
      checkedAt: "2026-08-16T01:00:00.000Z"
    });
  });

  it("retains completed actors for one hour and then prunes them", () => {
    const completed = applyEvent(createOfficeState(), {
      ...activeEvent,
      type: "agent.completed",
      inferred: false
    });
    expect(
      pruneCompletedAgents(completed, new Date("2026-08-16T00:59:59.000Z")).agents["agent-1"]
    ).toBeDefined();
    expect(
      pruneCompletedAgents(completed, new Date("2026-08-16T01:00:00.000Z")).agents["agent-1"]
    ).toBeUndefined();
  });

  it("retains inferred completion for an hour from its deterministic timeout boundary", () => {
    const active = applyEvent(createOfficeState(), activeEvent);
    const completed = inferTimedOutCompletions(active, new Date("2026-08-16T02:00:00.000Z"));
    expect(
      pruneCompletedAgents(completed, new Date("2026-08-16T01:04:59.999Z")).agents["agent-1"]
    ).toBeDefined();
    expect(
      pruneCompletedAgents(completed, new Date("2026-08-16T01:05:00.000Z")).agents["agent-1"]
    ).toBeUndefined();
  });

  it("keeps waiting and error agents regardless of age", () => {
    const waiting = applyEvent(createOfficeState(), {
      ...activeEvent,
      type: "agent.waiting",
      reason: "input"
    });
    const error = applyEvent(waiting, {
      ...activeEvent,
      eventId: "failed-1",
      agent: { id: "agent-2", kind: "main" },
      type: "agent.failed",
      error: { message: "safe failure" }
    });
    const pruned = pruneCompletedAgents(error, new Date("2027-08-16T00:00:00.000Z"));
    expect(Object.keys(pruned.agents).sort()).toEqual(["agent-1", "agent-2"]);
  });

  it("removes a completed character while retaining its chat and event logs", () => {
    let state = applyEvent(createOfficeState(), activeEvent);
    state = applyEvent(state, {
      ...activeEvent,
      eventId: "message-cleanup",
      type: "agent.message",
      message: { role: "assistant", text: "Done" }
    });
    state = applyEvent(state, {
      ...activeEvent,
      eventId: "completed-cleanup",
      type: "agent.completed",
      inferred: false
    });
    const pruned = pruneCompletedAgents(state, new Date("2026-08-16T01:00:00.000Z"));
    expect(pruned.agents["agent-1"]).toBeUndefined();
    expect(pruned.messages.map((event) => event.eventId)).toEqual(["message-cleanup"]);
    expect(pruned.recentEvents.map((event) => event.eventId)).toEqual([
      "completed-cleanup",
      "event-1"
    ]);
    expect(pruneCompletedAgents(pruned, new Date("2026-08-16T02:00:00.000Z"))).toBe(pruned);
  });

  it("keeps Claude and Codex identities separate for the same provider execution token", () => {
    const codex = applyEvent(createOfficeState(), {
      ...activeEvent,
      agent: { id: "codex:shared", kind: "main", executionId: "shared" }
    });
    const combined = applyEvent(codex, {
      ...activeEvent,
      eventId: "claude-shared",
      provider: "claude-code",
      agent: { id: "claude:shared", kind: "main", executionId: "shared" }
    });
    expect(Object.keys(combined.agents).sort()).toEqual(["claude:shared", "codex:shared"]);
  });
});
