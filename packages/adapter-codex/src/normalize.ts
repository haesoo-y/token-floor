import path from "node:path";
import { sanitizeSpeech, type AgentEvent } from "@token-floor/protocol";
import type { CodexLifecycleRecord, CodexSessionRecord } from "./types.js";

interface SessionContext extends CodexSessionRecord {
  sourceKey: string;
}

function actorId(threadId: string): string {
  return `codex:${threadId}`;
}

/** Correlates Codex lifecycle and visible chat while excluding tool inputs and results. */
export class CodexLifecycleNormalizer {
  private readonly sessions = new Map<string, SessionContext>();
  private readonly sourceSessions = new Map<string, SessionContext>();
  private readonly sessionAliases = new Map<string, Set<string>>();
  private readonly parentByChild = new Map<string, string>();
  private readonly waitingCalls = new Set<string>();

  registerSession(sourceKey: string, record: CodexSessionRecord): void {
    const context = { ...record, sourceKey };
    this.sessions.set(record.threadId, context);
    this.sourceSessions.set(sourceKey, context);
    const aliases = this.sessionAliases.get(record.sessionId) ?? new Set<string>();
    aliases.add(record.threadId);
    this.sessionAliases.set(record.sessionId, aliases);
  }

  sessionStarted(sourceKey: string): AgentEvent | undefined {
    const context = this.sourceSessions.get(sourceKey);
    return context
      ? {
          ...this.base(context, context.timestamp, `session:${context.threadId}`),
          type: "agent.started"
        }
      : undefined;
  }

  normalize(sourceKey: string, record: CodexLifecycleRecord): AgentEvent[] {
    const context = this.sourceSessions.get(sourceKey);
    if (!context) return [];
    if (record.type === "subagent.activity") return this.normalizeSubagentActivity(context, record);
    const discriminator =
      record.type === "message"
        ? `${record.timestamp}:${stableHash(`${record.role}:${record.text}`)}`
        : "turnId" in record && record.turnId
          ? record.turnId
          : "callId" in record
            ? record.callId
            : record.timestamp;
    const base = this.base(
      context,
      record.timestamp,
      `${record.type}:${discriminator ?? record.timestamp}`
    );
    const callKey = "callId" in record ? `${context.threadId}:${record.callId}` : undefined;
    if (record.type === "message") {
      const text = sanitizeSpeech(record.text, { maxLength: 200 });
      if (!text) return [];
      return [{ ...base, type: "agent.message", message: { role: record.role, text } }];
    }
    if (record.type === "task.completed")
      return [{ ...base, type: "agent.completed", inferred: false }];
    if (record.type === "task.failed") {
      return [{ ...base, type: "agent.failed", error: { message: "Codex execution failed" } }];
    }
    if (record.type === "waiting") {
      this.waitingCalls.add(callKey!);
      return [{ ...base, type: "agent.waiting", reason: record.reason }];
    }
    if (record.type === "task.started")
      return [{ ...base, type: "agent.active", activity: { summary: "Working" } }];
    const resumed = callKey ? this.waitingCalls.delete(callKey) : false;
    return [
      {
        ...base,
        type: "agent.active",
        activity: { summary: resumed ? "Working" : "Using a local tool" }
      }
    ];
  }

  private normalizeSubagentActivity(
    parent: SessionContext,
    record: Extract<CodexLifecycleRecord, { type: "subagent.activity" }>
  ): AgentEvent[] {
    this.parentByChild.set(record.childThreadId, actorId(parent.threadId));
    const child = this.sessions.get(record.childThreadId);
    if (!child) return [];
    const base = this.base(child, record.timestamp, `subagent:${record.eventId}`);
    if (record.state === "started") return [{ ...base, type: "agent.started" }];
    if (record.state === "failed") {
      return [{ ...base, type: "agent.failed", error: { message: "Codex subagent interrupted" } }];
    }
    return [{ ...base, type: "agent.active", activity: { summary: "Collaborating" } }];
  }

  private parentId(context: SessionContext): string | undefined {
    const observed = this.parentByChild.get(context.threadId);
    if (observed) return observed;
    if (context.forkedFromId && this.sessions.has(context.forkedFromId)) {
      return actorId(context.forkedFromId);
    }
    if (!context.parentThreadId) return undefined;
    const candidates = [...(this.sessionAliases.get(context.parentThreadId) ?? [])].filter(
      (id) => this.sessions.get(id)?.kind === "main"
    );
    return candidates.length === 1 ? actorId(candidates[0]!) : undefined;
  }

  private base(context: SessionContext, occurredAt: string, eventKey: string) {
    const parentId = context.kind === "subagent" ? this.parentId(context) : undefined;
    return {
      schemaVersion: 1 as const,
      eventId: `codex:${context.threadId}:${eventKey}`,
      occurredAt,
      provider: "codex",
      sessionId: context.sessionId,
      agent: {
        id: actorId(context.threadId),
        kind: context.kind,
        executionId: context.threadId,
        ...(parentId ? { parentId } : {})
      },
      project: { id: context.cwd, label: path.basename(context.cwd) || context.cwd }
    };
  }
}

function stableHash(value: string): string {
  let result = 2166136261;
  for (const character of value) result = Math.imul(result ^ character.charCodeAt(0), 16777619);
  return (result >>> 0).toString(36);
}
