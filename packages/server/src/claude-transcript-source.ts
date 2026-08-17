import fs from "node:fs";
import path from "node:path";
import { recoverClaudeTranscript } from "@token-floor/adapter-claude";
import type { AgentEvent } from "@token-floor/protocol";

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
    const buffer = Buffer.alloc(size - start);
    fs.readSync(descriptor, buffer, 0, buffer.length, start);
    return buffer.toString("utf8");
  } finally {
    fs.closeSync(descriptor);
  }
}

/** Recovers recent main-session metadata without retaining transcript message content. */
export function recoverClaudeProjectTranscripts(
  root: string,
  now = new Date(),
  lookbackMs = DEFAULT_LOOKBACK_MS
): AgentEvent[] {
  return recentJsonlFiles(root, now, lookbackMs).flatMap((filename) => {
    try {
      const event = recoverClaudeTranscript(readTail(filename), now);
      return event ? [event] : [];
    } catch {
      return [];
    }
  });
}
