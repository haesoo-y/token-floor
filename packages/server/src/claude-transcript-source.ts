import fs from "node:fs";
import path from "node:path";
import {
  recoverClaudeTranscript,
  recoverClaudeTranscriptMessages
} from "@token-floor/adapter-claude";
import type { AgentEvent } from "@token-floor/protocol";
import type { ProviderCollectorReport } from "./source-diagnostics.js";

const DEFAULT_LOOKBACK_MS = 24 * 60 * 60 * 1000;
const TAIL_BYTES = 128 * 1024;

function recentJsonlFiles(root: string, now: Date, lookbackMs: number): string[] {
  const files: string[] = [];
  const visit = (directory: string) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(filename);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith(".jsonl")) continue;
      try {
        if (now.getTime() - fs.statSync(filename).mtimeMs <= lookbackMs) files.push(filename);
      } catch {
        // A concurrently removed transcript is harmless; the next scan observes current files.
      }
    }
  };
  visit(root);
  return files;
}

function readTail(filename: string): string {
  const descriptor = fs.openSync(filename, "r");
  try {
    const size = fs.fstatSync(descriptor).size;
    const start = Math.max(0, size - TAIL_BYTES);
    const readStart = start > 0 ? start - 1 : 0;
    const buffer = Buffer.alloc(size - readStart);
    fs.readSync(descriptor, buffer, 0, buffer.length, readStart);
    const content = buffer.toString("utf8");
    if (start === 0) return content;
    const firstNewline = content.indexOf("\n");
    return firstNewline >= 0 ? content.slice(firstNewline + 1) : "";
  } finally {
    fs.closeSync(descriptor);
  }
}

/** Recovers recent main-session lifecycle and bounded visible chat from local transcripts. */
export function recoverClaudeProjectTranscripts(
  root: string,
  now = new Date(),
  lookbackMs = DEFAULT_LOOKBACK_MS
): AgentEvent[] {
  return recoverClaudeProjectTranscriptsWithDiagnostics(root, now, lookbackMs).events;
}

/** Recovers transcripts and reports only structural counters, never provider-owned content. */
export function recoverClaudeProjectTranscriptsWithDiagnostics(
  root: string,
  now = new Date(),
  lookbackMs = DEFAULT_LOOKBACK_MS
): { events: AgentEvent[]; report: ProviderCollectorReport } {
  const files = recentJsonlFiles(root, now, lookbackMs);
  const report: ProviderCollectorReport = {
    rootExists: fs.existsSync(root),
    fileCount: files.length,
    validRecordCount: 0,
    malformedRecordCount: 0,
    readErrorCount: 0
  };
  const events = files.flatMap((filename) => {
    try {
      const content = readTail(filename);
      const completeLines = content.endsWith("\n")
        ? content.split("\n")
        : content.split("\n").slice(0, -1);
      let fileValidCount = 0;
      for (const line of completeLines) {
        if (!line) continue;
        try {
          const record = JSON.parse(line) as Record<string, unknown>;
          report.validRecordCount += 1;
          fileValidCount += 1;
          if (
            typeof record.timestamp === "string" &&
            !Number.isNaN(Date.parse(record.timestamp)) &&
            (!report.latestRecordAt || record.timestamp > report.latestRecordAt)
          ) {
            report.latestRecordAt = record.timestamp;
          }
        } catch {
          report.malformedRecordCount += 1;
        }
      }
      if (fileValidCount > 0 && !report.latestRecordAt) {
        report.latestRecordAt = fs.statSync(filename).mtime.toISOString();
      }
      const event = recoverClaudeTranscript(content, now);
      return [...recoverClaudeTranscriptMessages(content), ...(event ? [event] : [])];
    } catch {
      report.readErrorCount += 1;
      return [];
    }
  });
  const messages = events
    .filter((event) => event.type === "agent.message")
    .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt))
    .slice(-100);
  return {
    events: [...messages, ...events.filter((event) => event.type !== "agent.message")],
    report
  };
}
