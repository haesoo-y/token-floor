import fs from "node:fs";
import path from "node:path";
import { normalizeClaudeApiUsage, normalizeClaudeUsage } from "@token-floor/adapter-claude";
import type { UsageUpdatedEvent } from "@token-floor/protocol";

interface LocalFile {
  filename: string;
  modifiedAt: Date;
}

function timestamp(value: unknown, fallback: Date): Date {
  if (typeof value !== "object" || value === null) return fallback;
  const input = value as Record<string, unknown>;
  for (const key of ["timestamp", "occurredAt", "created_at", "updated_at"]) {
    if (typeof input[key] !== "string") continue;
    const parsed = Date.parse(input[key]);
    if (Number.isFinite(parsed)) return new Date(parsed);
  }
  return fallback;
}

function normalizeCandidate(value: unknown, modifiedAt: Date): UsageUpdatedEvent | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const input = value as Record<string, unknown>;
  const occurredAt = timestamp(input, modifiedAt);
  const direct = normalizeClaudeApiUsage(input, occurredAt, "cli-local-cache");
  if (direct) return direct;
  if (typeof input.rate_limits === "object" && input.rate_limits !== null) {
    const event = normalizeClaudeUsage(input, occurredAt);
    if (event.usage.capability !== "unavailable") return event;
  }
  for (const child of Object.values(input)) {
    const nested = normalizeCandidate(child, occurredAt);
    if (nested) return nested;
  }
  return undefined;
}

function parseFile(file: LocalFile): UsageUpdatedEvent | undefined {
  const size = fs.statSync(file.filename).size;
  const length = Math.min(size, 512 * 1024);
  const descriptor = fs.openSync(file.filename, "r");
  const buffer = Buffer.alloc(length);
  try {
    fs.readSync(descriptor, buffer, 0, length, size - length);
  } finally {
    fs.closeSync(descriptor);
  }
  const content = buffer.toString("utf8");
  const lines = file.filename.endsWith(".jsonl")
    ? content.trimEnd().split("\n").reverse()
    : [content];
  for (const line of lines.slice(0, 128)) {
    try {
      const event = normalizeCandidate(JSON.parse(line), file.modifiedAt);
      if (event) return event;
    } catch {
      continue;
    }
  }
  return undefined;
}

function collectFiles(directory: string, files: LocalFile[], depth = 0): void {
  if (depth > 3) return;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory() && !["plugins", "skills", "tasks", "backups"].includes(entry.name)) {
      collectFiles(filename, files, depth + 1);
    }
    if (!entry.isFile() || !/\.(json|jsonl)$/.test(entry.name)) continue;
    try {
      files.push({ filename, modifiedAt: fs.statSync(filename).mtime });
    } catch {
      continue;
    }
  }
}

/** Reads exact rate-limit snapshots when a Claude CLI build persists them under ~/.claude. */
export function readLatestClaudeCliUsage(root: string): UsageUpdatedEvent | undefined {
  const files: LocalFile[] = [];
  collectFiles(root, files);
  files.sort((left, right) => right.modifiedAt.getTime() - left.modifiedAt.getTime());
  for (const file of files.slice(0, 64)) {
    try {
      const event = parseFile(file);
      if (event) return event;
    } catch {
      continue;
    }
  }
  return undefined;
}
