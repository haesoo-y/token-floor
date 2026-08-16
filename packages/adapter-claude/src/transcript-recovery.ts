import path from "node:path";
import type { AgentEvent } from "@token-floor/protocol";

interface TranscriptMetadata {
  sessionId: string;
  cwd: string;
  timestamp: string;
  isSidechain: boolean;
}

function metadataFromLine(line: string): TranscriptMetadata | undefined {
  try {
    const value = JSON.parse(line) as Record<string, unknown>;
    if (
      typeof value.sessionId !== "string" ||
      typeof value.cwd !== "string" ||
      typeof value.timestamp !== "string"
    ) {
      return undefined;
    }
    return {
      sessionId: value.sessionId,
      cwd: value.cwd,
      timestamp: value.timestamp,
      isSidechain: value.isSidechain === true
    };
  } catch {
    return undefined;
  }
}

/**
 * Recovers only session metadata from a Claude JSONL transcript.
 * Message content, tool inputs, and tool results are never copied into the normalized event.
 */
export function recoverClaudeTranscript(
  content: string,
  now = new Date(),
  completionTimeoutMs = 5 * 60 * 1000
): AgentEvent | undefined {
  let latest: TranscriptMetadata | undefined;
  for (const line of content.split("\n")) {
    const metadata = metadataFromLine(line);
    if (metadata && !metadata.isSidechain) latest = metadata;
  }
  if (!latest) return undefined;
  const inferred = now.getTime() - Date.parse(latest.timestamp) >= completionTimeoutMs;
  const base = {
    schemaVersion: 1 as const,
    eventId: `claude-recovery:${latest.sessionId}:${latest.timestamp}`,
    occurredAt: latest.timestamp,
    provider: "claude-code",
    sessionId: latest.sessionId,
    agent: { id: `claude:${latest.sessionId}`, kind: "main" as const },
    project: { id: latest.cwd, label: path.basename(latest.cwd) || latest.cwd }
  };
  return inferred
    ? { ...base, type: "agent.completed", inferred: true }
    : { ...base, type: "agent.active", activity: { summary: "Recovered Claude session" } };
}
