import { describe, expect, it } from "vitest";
import { parseNormalizedEvent } from "./validation.js";

const validEvent = {
  schemaVersion: 1,
  eventId: "event-1",
  occurredAt: "2026-08-16T00:00:00.000Z",
  provider: "claude-code",
  sessionId: "session-1",
  type: "agent.started",
  agent: { id: "agent-1", kind: "main" },
  project: { id: "project-1", label: "token-floor" }
};

describe("parseNormalizedEvent", () => {
  it("accepts a valid versioned event", () => {
    expect(parseNormalizedEvent(validEvent)).toEqual(validEvent);
  });

  it("accepts reusable actor metadata for provider executions", () => {
    const event = {
      ...validEvent,
      agent: {
        id: "claude:session-1:sub:0",
        kind: "subagent",
        parentId: "claude:session-1",
        executionId: "agent-7",
        role: "Explore"
      }
    };
    expect(parseNormalizedEvent(event)).toEqual(event);
  });

  it("rejects unknown versions and incomplete payloads", () => {
    expect(() => parseNormalizedEvent({ ...validEvent, schemaVersion: 2 })).toThrow(
      "Invalid event envelope"
    );
    expect(() => parseNormalizedEvent({ ...validEvent, agent: undefined })).toThrow(
      "Invalid event payload"
    );
  });

  it("bounds weekly usage percentages", () => {
    const usage = {
      ...validEvent,
      type: "usage.updated",
      usage: {
        capability: "weekly-percentage",
        remainingPercent: 101
      }
    };
    expect(() => parseNormalizedEvent(usage)).toThrow("Invalid event payload");
    expect(() =>
      parseNormalizedEvent({
        ...usage,
        usage: {
          capability: "weekly-percentage",
          remainingPercent: 50,
          fiveHourRemainingPercent: -1
        }
      })
    ).toThrow("Invalid event payload");
  });
});
