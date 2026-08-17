import fs from "node:fs";
import {
  CodexLifecycleNormalizer,
  decodeCodexRecord,
  type CodexLifecycleRecord,
  type CodexSessionRecord
} from "@token-floor/adapter-codex";
import type { AgentEvent } from "@token-floor/protocol";
import { recentCodexSessionFiles } from "./codex-session-files.js";

const PREFIX_BYTES = 128 * 1024;
const TAIL_BYTES = 512 * 1024;

interface Cursor {
  size: number;
  remainder: Buffer;
  started: boolean;
}

interface PendingRecord {
  sourceKey: string;
  record: CodexLifecycleRecord;
}

function readRange(filename: string, start: number, length: number): Buffer {
  const descriptor = fs.openSync(filename, "r");
  try {
    const buffer = Buffer.alloc(length);
    fs.readSync(descriptor, buffer, 0, length, start);
    return buffer;
  } finally {
    fs.closeSync(descriptor);
  }
}

function completeLines(
  buffer: Buffer,
  discardFirst: boolean
): { lines: string[]; remainder: Buffer } {
  const firstNewline = buffer.indexOf(10);
  const safe = discardFirst
    ? firstNewline >= 0
      ? buffer.subarray(firstNewline + 1)
      : Buffer.alloc(0)
    : buffer;
  const lastNewline = safe.lastIndexOf(10);
  if (lastNewline < 0) return { lines: [], remainder: Buffer.from(safe) };
  return {
    lines: safe.subarray(0, lastNewline).toString("utf8").split("\n"),
    remainder: Buffer.from(safe.subarray(lastNewline + 1))
  };
}

function decodeLines(lines: readonly string[]): Array<CodexSessionRecord | CodexLifecycleRecord> {
  const records: Array<CodexSessionRecord | CodexLifecycleRecord> = [];
  for (const line of lines) {
    try {
      const record = decodeCodexRecord(JSON.parse(line));
      if (record) records.push(record);
    } catch {
      // A malformed record is isolated to its line; later complete records remain observable.
    }
  }
  return records;
}

/** Incrementally tails recent Codex JSONL files without mutating provider-owned state. */
export class CodexSessionCollector {
  private readonly cursors = new Map<string, Cursor>();
  private readonly normalizer = new CodexLifecycleNormalizer();
  private readonly hiddenAgents = new Set<string>();
  private recovering = true;

  constructor(private readonly root: string) {}

  /** Returns structurally identified provider-internal actors seen by this collector. */
  hiddenAgentIds(): ReadonlySet<string> {
    return this.hiddenAgents;
  }

  poll(now = new Date()): AgentEvent[] {
    const sessions: Array<{ sourceKey: string; record: CodexSessionRecord }> = [];
    const pending: PendingRecord[] = [];
    const files = recentCodexSessionFiles(this.root, now, new Set(this.cursors.keys()));
    for (const filename of files) {
      try {
        this.collectFile(filename, sessions, pending);
      } catch {
        // One locked, replaced, or concurrently deleted file must not abort the collection cycle.
      }
    }
    for (const { sourceKey, record } of sessions) {
      if (record.subagentKind === "guardian") this.hiddenAgents.add(`codex:${record.threadId}`);
      this.normalizer.registerSession(sourceKey, record);
    }
    const timeline: Array<{ timestamp: string; run: () => AgentEvent[] }> = [];
    for (const { sourceKey } of sessions) {
      const cursor = this.cursors.get(sourceKey);
      if (!cursor || cursor.started) continue;
      const event = this.normalizer.sessionStarted(sourceKey);
      cursor.started = true;
      if (event) timeline.push({ timestamp: event.occurredAt, run: () => [event] });
    }
    for (const item of pending) {
      timeline.push({
        timestamp: item.record.timestamp,
        run: () => this.normalizer.normalize(item.sourceKey, item.record)
      });
    }
    const events = timeline
      .sort((left, right) => left.timestamp.localeCompare(right.timestamp))
      .flatMap((item) => item.run());
    if (!this.recovering) return events;
    this.recovering = false;
    const latest = new Map<string, AgentEvent>();
    const messages: AgentEvent[] = [];
    for (const event of events) {
      if (event.type === "agent.message") messages.push(event);
      else latest.set(event.agent.id, event);
    }
    return [...latest.values(), ...messages.slice(-100)];
  }

  private collectFile(
    filename: string,
    sessions: Array<{ sourceKey: string; record: CodexSessionRecord }>,
    pending: PendingRecord[]
  ): void {
    const size = fs.statSync(filename).size;
    let cursor = this.cursors.get(filename);
    if (!cursor || size < cursor.size) {
      cursor = { size: 0, remainder: Buffer.alloc(0), started: false };
      this.cursors.set(filename, cursor);
    }
    const records =
      cursor.size === 0
        ? this.initialRecords(filename, size, cursor)
        : this.newRecords(filename, size, cursor);
    for (const record of records) {
      if (record.type === "session") sessions.push({ sourceKey: filename, record });
      else pending.push({ sourceKey: filename, record });
    }
  }

  private initialRecords(filename: string, size: number, cursor: Cursor) {
    let lines: string[];
    if (size <= PREFIX_BYTES + TAIL_BYTES) {
      const complete = completeLines(readRange(filename, 0, size), false);
      lines = complete.lines;
      cursor.remainder = complete.remainder;
    } else {
      const prefix = completeLines(readRange(filename, 0, PREFIX_BYTES), false).lines;
      const tail = completeLines(readRange(filename, size - TAIL_BYTES, TAIL_BYTES), true);
      lines = [...prefix, ...tail.lines];
      cursor.remainder = tail.remainder;
    }
    cursor.size = size;
    return decodeLines(lines);
  }

  private newRecords(filename: string, size: number, cursor: Cursor) {
    if (size === cursor.size) return [];
    const start = Math.max(cursor.size, size - TAIL_BYTES);
    const contiguous = start === cursor.size;
    const bytes = Buffer.concat([
      contiguous ? cursor.remainder : Buffer.alloc(0),
      readRange(filename, start, size - start)
    ]);
    const complete = completeLines(bytes, !contiguous);
    cursor.size = size;
    cursor.remainder = complete.remainder;
    return decodeLines(complete.lines);
  }
}
