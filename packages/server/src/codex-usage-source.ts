import fs from "node:fs";
import path from "node:path";
import { normalizeCodexUsage } from "@token-floor/adapter-codex";
import type { UsageUpdatedEvent } from "@token-floor/protocol";

const MAX_TAIL_BYTES = 512 * 1024;

function dateDirectory(root: string, date: Date): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return path.join(root, year, month, day);
}

function recentRollouts(root: string, now: Date): string[] {
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return [dateDirectory(root, now), dateDirectory(root, yesterday)]
    .flatMap((directory) => {
      try {
        return fs
          .readdirSync(directory)
          .filter((name) => name.endsWith(".jsonl"))
          .map((name) => path.join(directory, name));
      } catch {
        return [];
      }
    })
    .sort((left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs)
    .slice(0, 12);
}

function readTail(filename: string): string {
  const size = fs.statSync(filename).size;
  const length = Math.min(size, MAX_TAIL_BYTES);
  const buffer = Buffer.alloc(length);
  const descriptor = fs.openSync(filename, "r");
  try {
    fs.readSync(descriptor, buffer, 0, length, size - length);
  } finally {
    fs.closeSync(descriptor);
  }
  const text = buffer.toString("utf8");
  return size > length ? text.slice(text.indexOf("\n") + 1) : text;
}

/** Reads the newest account-wide weekly limit recorded in Codex's local session root. */
export function readLatestCodexUsage(
  sessionsRoot: string,
  now = new Date()
): UsageUpdatedEvent | undefined {
  let latest: UsageUpdatedEvent | undefined;
  for (const filename of recentRollouts(sessionsRoot, now)) {
    try {
      const lines = readTail(filename).trimEnd().split("\n").reverse();
      for (const line of lines) {
        const event = normalizeCodexUsage(JSON.parse(line), path.basename(filename, ".jsonl"));
        if (!event) continue;
        if (!latest || event.occurredAt > latest.occurredAt) latest = event;
        break;
      }
    } catch {
      continue;
    }
  }
  return latest;
}
