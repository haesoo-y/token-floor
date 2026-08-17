import {
  createOpaqueProjectIdentity,
  sanitizeSpeech,
  type AgentEvent
} from "@token-floor/protocol";

interface TranscriptMetadata {
  sessionId: string;
  cwd: string;
  timestamp: string;
  isSidechain: boolean;
}

function messageText(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return undefined;
  const text = value
    .filter(
      (block): block is Record<string, unknown> =>
        typeof block === "object" && block !== null && !Array.isArray(block)
    )
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => String(block.text))
    .join(" ");
  return text || undefined;
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
    eventId: `claude-recovery:${latest.sessionId}:${latest.timestamp}:${inferred ? "completed" : "active"}`,
    occurredAt: latest.timestamp,
    provider: "claude-code",
    sessionId: latest.sessionId,
    agent: { id: `claude:${latest.sessionId}`, kind: "main" as const },
    project: createOpaqueProjectIdentity("claude-code", latest.cwd)
  };
  return inferred
    ? { ...base, type: "agent.completed", inferred: true }
    : { ...base, type: "agent.active", activity: { summary: "Recovered Claude session" } };
}

/** Recovers bounded visible chat text while excluding tool-use and tool-result blocks. */
export function recoverClaudeTranscriptMessages(content: string): AgentEvent[] {
  const events: AgentEvent[] = [];
  for (const line of content.split("\n")) {
    try {
      const value = JSON.parse(line) as Record<string, unknown>;
      const metadata = metadataFromLine(line);
      if (
        !metadata ||
        metadata.isSidechain ||
        (value.type !== "user" && value.type !== "assistant")
      ) {
        continue;
      }
      const message = value.message;
      if (typeof message !== "object" || message === null || Array.isArray(message)) continue;
      const text = sanitizeSpeech(messageText((message as Record<string, unknown>).content) ?? "", {
        maxLength: 200
      });
      if (!text) continue;
      const messageKey =
        typeof value.uuid === "string" ? value.uuid : stableHash(`${value.type}:${text}`);
      events.push({
        schemaVersion: 1,
        eventId: `claude-message:${metadata.sessionId}:${metadata.timestamp}:${messageKey}`,
        occurredAt: metadata.timestamp,
        provider: "claude-code",
        sessionId: metadata.sessionId,
        agent: { id: `claude:${metadata.sessionId}`, kind: "main" },
        project: createOpaqueProjectIdentity("claude-code", metadata.cwd),
        type: "agent.message",
        message: { role: value.type, text }
      });
    } catch {
      // A malformed transcript line does not hide later complete chat messages.
    }
  }
  return events;
}

function stableHash(value: string): string {
  let result = 2166136261;
  for (const character of value) result = Math.imul(result ^ character.charCodeAt(0), 16777619);
  return (result >>> 0).toString(36);
}
