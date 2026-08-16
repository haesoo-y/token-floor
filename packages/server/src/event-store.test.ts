import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { NormalizedEvent } from "@token-floor/protocol";
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
    expect(store.load()).toEqual([event]);
    store.close();
  });
});
