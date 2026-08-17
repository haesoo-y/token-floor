import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { parseNormalizedEvent, type NormalizedEvent } from "@token-floor/protocol";
import { persistedEvent } from "./persisted-event.js";
import { ensurePrivateDirectory } from "./private-files.js";

export interface EventStore {
  append: (event: NormalizedEvent) => void;
  load: () => NormalizedEvent[];
  close: () => void;
}

/** Persists only normalized events; raw provider payloads never cross this storage boundary. */
export class SqliteEventStore implements EventStore {
  private readonly database: DatabaseSync;

  constructor(filename: string) {
    ensurePrivateDirectory(path.dirname(filename));
    this.database = new DatabaseSync(filename);
    fs.chmodSync(filename, 0o600);
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS normalized_events (
        event_id TEXT PRIMARY KEY,
        occurred_at TEXT NOT NULL,
        payload TEXT NOT NULL
      ) STRICT
    `);
  }

  append(event: NormalizedEvent): void {
    const safeEvent = persistedEvent(event);
    this.database
      .prepare("INSERT OR IGNORE INTO normalized_events VALUES (?, ?, ?)")
      .run(safeEvent.eventId, safeEvent.occurredAt, JSON.stringify(safeEvent));
  }

  load(): NormalizedEvent[] {
    const rows = this.database
      .prepare("SELECT payload FROM normalized_events ORDER BY occurred_at, event_id")
      .all() as Array<{ payload: string }>;
    const events: NormalizedEvent[] = [];
    for (const row of rows) {
      try {
        // Re-apply the storage allowlist so legacy rows cannot restore discarded provider fields.
        events.push(persistedEvent(parseNormalizedEvent(JSON.parse(row.payload))));
      } catch {
        // A damaged persisted row is isolated so the last valid projection can still recover.
      }
    }
    return events;
  }

  close(): void {
    this.database.close();
  }
}
