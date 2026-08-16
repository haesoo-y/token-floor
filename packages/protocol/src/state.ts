import type { AgentEvent, AgentStatus, NormalizedEvent, UsageUpdatedEvent } from "./model.js";
import { isAgentEvent } from "./model.js";

export const DEFAULT_COMPLETION_TIMEOUT_MS = 5 * 60 * 1000;

export interface AgentSnapshot {
  id: string;
  sessionId: string;
  provider: string;
  projectId: string;
  projectLabel: string;
  kind: "main" | "subagent";
  parentId?: string;
  status: AgentStatus;
  lastEventAt: string;
  inferredCompletion: boolean;
  activity?: { tool?: string; summary?: string };
  waitReason?: "input" | "permission";
  error?: { code?: string; message: string };
}

export type UsageSnapshot = UsageUpdatedEvent["usage"] & { checkedAt: string };

export interface OfficeState {
  agents: Record<string, AgentSnapshot>;
  usageByProvider: Record<string, UsageSnapshot>;
}

export function createOfficeState(): OfficeState {
  return { agents: {}, usageByProvider: {} };
}

function statusFor(event: AgentEvent): AgentStatus {
  if (event.type === "agent.waiting") return "waiting";
  if (event.type === "agent.completed") return "completed";
  if (event.type === "agent.failed") return "error";
  return "active";
}

function projectAgent(event: AgentEvent): AgentSnapshot {
  const base: AgentSnapshot = {
    id: event.agent.id,
    sessionId: event.sessionId,
    provider: event.provider,
    projectId: event.project.id,
    projectLabel: event.project.label,
    kind: event.agent.kind,
    status: statusFor(event),
    lastEventAt: event.occurredAt,
    inferredCompletion: event.type === "agent.completed" && event.inferred
  };
  if (event.agent.parentId !== undefined) base.parentId = event.agent.parentId;
  if (event.type === "agent.active") base.activity = event.activity;
  if (event.type === "agent.waiting") base.waitReason = event.reason;
  if (event.type === "agent.failed") base.error = event.error;

  // Each event is a full projection, so stale wait, error, and activity details are discarded.
  return base;
}

/**
 * Projects one normalized event into immutable office state.
 *
 * Older agent events are ignored so delayed adapter output cannot roll the UI back.
 */
export function applyEvent(state: OfficeState, event: NormalizedEvent): OfficeState {
  if (!isAgentEvent(event)) {
    return {
      ...state,
      usageByProvider: {
        ...state.usageByProvider,
        [event.provider]: { ...event.usage, checkedAt: event.occurredAt }
      }
    };
  }
  const previous = state.agents[event.agent.id];
  if (previous && Date.parse(previous.lastEventAt) > Date.parse(event.occurredAt)) return state;
  return {
    ...state,
    agents: { ...state.agents, [event.agent.id]: projectAgent(event) }
  };
}

/**
 * Marks silent active agents as completed when a provider cannot emit a terminal event.
 * Waiting agents are deliberately excluded because they still require user action.
 */
export function inferTimedOutCompletions(
  state: OfficeState,
  now: Date,
  timeoutMs = DEFAULT_COMPLETION_TIMEOUT_MS
): OfficeState {
  let changed = false;
  const agents: Record<string, AgentSnapshot> = { ...state.agents };
  for (const [id, agent] of Object.entries(state.agents)) {
    // Waiting agents require user action and must never be mistaken for completed work.
    if (agent.status !== "active" || now.getTime() - Date.parse(agent.lastEventAt) < timeoutMs) {
      continue;
    }
    changed = true;
    agents[id] = { ...agent, status: "completed", inferredCompletion: true };
  }
  return changed ? { ...state, agents } : state;
}
