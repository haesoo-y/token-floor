import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  applyEvent,
  createOfficeState,
  pruneCompletedAgents,
  type NormalizedEvent
} from "@token-floor/protocol";
import { DatabaseSync } from "node:sqlite";
import { SqliteEventStore } from "./event-store.js";

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0)) fs.rmSync(directory, { recursive: true });
});

describe("SqliteEventStore", () => {
  it("restores normalized metadata without duplicating event ids", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "token-floor-"));
    directories.push(directory);
    const store = new SqliteEventStore(path.join(directory, "events.db"));
    const event: NormalizedEvent = {
      schemaVersion: 1,
      eventId: "event-1",
      occurredAt: "2026-08-16T00:00:00.000Z",
      provider: "claude-code",
      sessionId: "session-1",
      type: "agent.started",
      agent: { id: "claude:session-1", kind: "main" },
      project: { id: "/work/project", label: "project" }
    };
    store.append(event);
    store.append(event);
    const restored = store.load();
    expect(restored).toHaveLength(1);
    expect(restored[0]).toMatchObject({
      ...event,
      project: { id: expect.stringMatching(/^project:claude-code:[0-9a-f]{16}$/), label: "project" }
    });
    expect(JSON.stringify(restored)).not.toContain("/work/project");
    store.close();
  });

  it("isolates a malformed persisted row while restoring valid events", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "token-floor-"));
    directories.push(directory);
    const filename = path.join(directory, "events.db");
    const store = new SqliteEventStore(filename);
    store.close();
    const database = new DatabaseSync(filename);
    database
      .prepare("INSERT INTO normalized_events VALUES (?, ?, ?)")
      .run("broken", "2026-08-16T00:00:00.000Z", "{broken");
    database.close();
    const restored = new SqliteEventStore(filename);
    expect(restored.load()).toEqual([]);
    restored.close();
  });

  it("restores chat and event logs after the completed character expires", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "token-floor-"));
    directories.push(directory);
    const filename = path.join(directory, "events.db");
    const store = new SqliteEventStore(filename);
    const active: NormalizedEvent = {
      schemaVersion: 1,
      eventId: "active-1",
      occurredAt: "2026-08-16T00:00:00.000Z",
      provider: "codex",
      sessionId: "session-1",
      type: "agent.active",
      agent: { id: "codex:session-1", kind: "main", executionId: "session-1" },
      project: { id: "/work/project", label: "project" },
      activity: { summary: "Working" }
    };
    const message: NormalizedEvent = {
      ...active,
      eventId: "message-1",
      occurredAt: "2026-08-16T00:01:00.000Z",
      type: "agent.message",
      message: { role: "assistant", text: "Finished safely." }
    };
    const completed: NormalizedEvent = {
      ...active,
      eventId: "completed-1",
      occurredAt: "2026-08-16T00:02:00.000Z",
      type: "agent.completed",
      inferred: false
    };
    for (const event of [active, message, completed]) store.append(event);
    store.close();

    const reopened = new SqliteEventStore(filename);
    const restored = pruneCompletedAgents(
      reopened.load().reduce(applyEvent, createOfficeState()),
      new Date("2026-08-16T03:02:00.000Z")
    );
    expect(restored.agents["codex:session-1"]).toBeUndefined();
    expect(restored.messages.map((event) => event.eventId)).toEqual(["message-1"]);
    expect(restored.recentEvents.map((event) => event.eventId)).toEqual([
      "completed-1",
      "active-1"
    ]);
    reopened.close();
  });

  it("restores the latest one hundred chat and event entries independently", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "token-floor-"));
    directories.push(directory);
    const filename = path.join(directory, "events.db");
    const store = new SqliteEventStore(filename);
    const base: NormalizedEvent = {
      schemaVersion: 1,
      eventId: "base",
      occurredAt: "2026-08-16T00:00:00.000Z",
      provider: "codex",
      sessionId: "session",
      type: "agent.active",
      agent: { id: "codex:session", kind: "main", executionId: "session" },
      project: { id: "/work/project", label: "project" },
      activity: { summary: "Working" }
    };
    for (let index = 0; index < 105; index += 1) {
      const occurredAt = new Date(Date.parse(base.occurredAt) + index * 2 + 1).toISOString();
      store.append({ ...base, eventId: `event-${index}`, occurredAt });
      store.append({
        ...base,
        eventId: `message-${index}`,
        occurredAt: new Date(Date.parse(occurredAt) + 1).toISOString(),
        type: "agent.message",
        message: { role: "assistant", text: `Message ${index}` }
      });
    }
    store.close();

    const reopened = new SqliteEventStore(filename);
    const state = reopened.load().reduce(applyEvent, createOfficeState());
    expect(state.messages).toHaveLength(100);
    expect(state.messages[0]?.eventId).toBe("message-104");
    expect(state.recentEvents).toHaveLength(100);
    expect(state.recentEvents[0]?.eventId).toBe("event-104");
    reopened.close();
  });

  it("allowlists persisted fields and redacts credentials from durable logs", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "token-floor-"));
    directories.push(directory);
    const store = new SqliteEventStore(path.join(directory, "events.db"));
    const event = {
      schemaVersion: 1,
      eventId: "safe-message",
      occurredAt: "2026-08-16T00:00:00.000Z",
      provider: "codex",
      sessionId: "session",
      type: "agent.message",
      agent: { id: "codex:session", kind: "main" },
      project: { id: "/work/project", label: "project" },
      message: { role: "assistant", text: "Bearer private.token API_TOKEN=private" },
      providerPayload: { tool_input: "private", tool_result: "private" }
    } as NormalizedEvent;
    store.append(event);

    expect(store.load()[0]).toMatchObject({
      type: "agent.message",
      project: { id: expect.stringMatching(/^project:codex:[0-9a-f]{16}$/) },
      message: { text: "Bearer [REDACTED_TOKEN] API_TOKEN=[REDACTED]" }
    });
    expect(JSON.stringify(store.load()[0])).not.toContain("/work/project");
    expect(JSON.stringify(store.load()[0])).not.toMatch(/providerPayload|tool_input|tool_result/);
    store.close();
  });
});
