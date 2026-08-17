import fs from "node:fs";
import {
  normalizeClaudeDesktopUsageHistory,
  normalizeClaudeUsage
} from "@token-floor/adapter-claude";
import type { UsageUpdatedEvent } from "@token-floor/protocol";

/** Reads the sanitized status-line handoff file when direct localhost delivery is unavailable. */
export function readClaudeUsageFile(
  filename: string,
  now = new Date()
): UsageUpdatedEvent | undefined {
  try {
    const payload: unknown = JSON.parse(fs.readFileSync(filename, "utf8"));
    return normalizeClaudeDesktopUsageHistory(payload) ?? normalizeClaudeUsage(payload, now);
  } catch {
    return undefined;
  }
}
