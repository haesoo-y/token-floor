import type { AgentEvent, NormalizedEvent } from "@token-floor/protocol";

const identities = [
  { id: "codex-main", provider: "codex", kind: "main" as const },
  { id: "codex-sub", provider: "codex", kind: "subagent" as const, parentId: "codex-main" },
  { id: "claude-main", provider: "claude-code", kind: "main" as const },
  {
    id: "claude-sub",
    provider: "claude-code",
    kind: "subagent" as const,
    parentId: "claude-main"
  },
  { id: "codex-review", provider: "codex", kind: "main" as const },
  { id: "claude-docs", provider: "claude-code", kind: "main" as const }
];

const activities = [
  { tool: "Read", summary: "Reading the event contract" },
  { tool: "Shell", summary: "Running unit tests" },
  { tool: "Edit", summary: "Updating the office scene" },
  { tool: "Search", summary: "Finding adapter boundaries" }
];

function base(identity: (typeof identities)[number], now: string, eventId: string) {
  return {
    schemaVersion: 1 as const,
    eventId,
    occurredAt: now,
    provider: identity.provider,
    sessionId: `session-${identity.id}`,
    agent: {
      id: identity.id,
      kind: identity.kind,
      ...(identity.parentId ? { parentId: identity.parentId } : {})
    },
    project: { id: "token-floor", label: "token-floor" }
  };
}

/** Builds a deterministic snapshot seed for the Phase 01 simulated provider adapter. */
export function createInitialEvents(now = new Date()): NormalizedEvent[] {
  const occurredAt = now.toISOString();
  const agents: AgentEvent[] = identities.map((identity, index) => ({
    ...base(identity, occurredAt, `initial-${index}`),
    type: "agent.active",
    activity: activities[index % activities.length] ?? activities[0]!
  }));
  return [
    ...agents,
    {
      schemaVersion: 1,
      eventId: "usage-codex",
      occurredAt,
      provider: "codex",
      sessionId: "usage",
      type: "usage.updated",
      usage: { capability: "unavailable", unavailableReason: "Awaiting a safe local source" }
    },
    {
      schemaVersion: 1,
      eventId: "usage-claude",
      occurredAt,
      provider: "claude-code",
      sessionId: "usage",
      type: "usage.updated",
      usage: { capability: "weekly-percentage", remainingPercent: 68 }
    }
  ];
}

/** Advances the deterministic lifecycle scenario used by the local development server. */
export function createScenarioEvent(step: number, now = new Date()): AgentEvent {
  const identity = identities[step % identities.length] ?? identities[0]!;
  const common = base(identity, now.toISOString(), `scenario-${step}`);
  const phase = step % 5;
  if (phase === 1) return { ...common, type: "agent.waiting", reason: "permission" };
  if (phase === 2) return { ...common, type: "agent.completed", inferred: false };
  if (phase === 3)
    return { ...common, type: "agent.failed", error: { message: "Simulated check failed" } };
  return {
    ...common,
    type: "agent.active",
    activity: activities[step % activities.length] ?? activities[0]!
  };
}
