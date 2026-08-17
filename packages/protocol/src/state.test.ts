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
});
