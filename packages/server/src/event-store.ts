import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { parseNormalizedEvent, type NormalizedEvent } from "@token-floor/protocol";

export interface EventStore {
  append: (event: NormalizedEvent) => void;
  load: () => NormalizedEvent[];
  close: () => void;
}

/** Persists only normalized events; raw provider payloads never cross this storage boundary. */
export class SqliteEventStore implements EventStore {
  private readonly database: DatabaseSync;

  constructor(filename: string) {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    this.database = new DatabaseSync(filename);
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS normalized_events (
        event_id TEXT PRIMARY KEY,
        occurred_at TEXT NOT NULL,
        payload TEXT NOT NULL
      ) STRICT
    `);
  }

  append(event: NormalizedEvent): void {
    this.database
      .prepare("INSERT OR IGNORE INTO normalized_events VALUES (?, ?, ?)")
      .run(event.eventId, event.occurredAt, JSON.stringify(event));
  }

  load(): NormalizedEvent[] {
    const rows = this.database
      .prepare("SELECT payload FROM normalized_events ORDER BY occurred_at, event_id")
      .all() as Array<{ payload: string }>;
    return rows.map((row) => parseNormalizedEvent(JSON.parse(row.payload)));
  }

  close(): void {
    this.database.close();
  }
}
