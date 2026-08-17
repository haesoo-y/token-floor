import type {
  AgentChatMessage,
  AgentEvent,
  AgentMessageEvent,
  AgentStatus,
  NormalizedEvent,
  UsageUpdatedEvent
} from "./model.js";
import { isAgentEvent } from "./model.js";

export const DEFAULT_COMPLETION_TIMEOUT_MS = 5 * 60 * 1000;
export const DEFAULT_COMPLETED_RETENTION_MS = 60 * 60 * 1000;

export interface AgentSnapshot {
  id: string;
  sessionId: string;
  provider: string;
  projectId: string;
  projectLabel: string;
  kind: "main" | "subagent";
  parentId?: string;
  executionId?: string;
  role?: string;
  status: AgentStatus;
  lastEventAt: string;
  inferredCompletion: boolean;
  activity?: { tool?: string; summary?: string };
  lastMessage?: AgentChatMessage;
  waitReason?: "input" | "permission";
  error?: { code?: string; message: string };
}

export type UsageSnapshot = UsageUpdatedEvent["usage"] & { checkedAt: string };

export interface OfficeState {
  agents: Record<string, AgentSnapshot>;
  usageByProvider: Record<string, UsageSnapshot>;
  messages: AgentMessageEvent[];
  recentEvents: NormalizedEvent[];
}

export function createOfficeState(): OfficeState {
  return { agents: {}, usageByProvider: {}, messages: [], recentEvents: [] };
}

function recordRecentEvent(state: OfficeState, event: NormalizedEvent): OfficeState {
  if (event.type === "agent.message") return state;
  const recentEvents = state.recentEvents ?? [];
  if (recentEvents.some((recent) => recent.eventId === event.eventId)) return state;
  return { ...state, recentEvents: [event, ...recentEvents].slice(0, 50) };
}

function statusFor(event: AgentEvent): AgentStatus {
  if (event.type === "agent.waiting") return "waiting";
  if (event.type === "agent.completed") return "completed";
  if (event.type === "agent.failed") return "error";
  return "active";
}

function projectAgent(
  event: Exclude<AgentEvent, AgentMessageEvent>,
  previous?: AgentSnapshot
): AgentSnapshot {
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
  if (event.agent.executionId !== undefined) base.executionId = event.agent.executionId;
  if (event.agent.role !== undefined) base.role = event.agent.role;
  if (event.type === "agent.active") base.activity = event.activity;
  if (event.type === "agent.waiting") base.waitReason = event.reason;
  if (event.type === "agent.failed") base.error = event.error;
  if (previous?.lastMessage) base.lastMessage = previous.lastMessage;

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
    return recordRecentEvent(
      {
        ...state,
        usageByProvider: {
          ...state.usageByProvider,
          [event.provider]: { ...event.usage, checkedAt: event.occurredAt }
        }
      },
      event
    );
  }
  if (event.type === "agent.message") {
    const messages = state.messages ?? [];
    if (messages.some((message) => message.eventId === event.eventId)) return state;
    const previous = state.agents[event.agent.id];
    const agents = { ...state.agents };
    if (previous && event.message.role === "assistant") {
      agents[event.agent.id] = { ...previous, lastMessage: event.message };
    } else if (previous) {
      const withoutLastMessage = { ...previous };
      delete withoutLastMessage.lastMessage;
      agents[event.agent.id] = withoutLastMessage;
    }
    return {
      ...state,
      agents,
      messages: [event, ...messages].slice(0, 100)
    };
  }
  const previous = state.agents[event.agent.id];
  if (previous && Date.parse(previous.lastEventAt) > Date.parse(event.occurredAt)) return state;
  return recordRecentEvent(
    {
      ...state,
      agents: { ...state.agents, [event.agent.id]: projectAgent(event, previous) }
    },
    event
  );
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

/** Removes completed actors after the office's bounded history window expires. */
export function pruneCompletedAgents(
  state: OfficeState,
  now: Date,
  retentionMs = DEFAULT_COMPLETED_RETENTION_MS
): OfficeState {
  const agents = Object.fromEntries(
    Object.entries(state.agents).filter(
      ([, agent]) =>
        agent.status !== "completed" || now.getTime() - Date.parse(agent.lastEventAt) < retentionMs
    )
  );
  return Object.keys(agents).length === Object.keys(state.agents).length
    ? state
    : {
        ...state,
        agents,
        messages: (state.messages ?? []).filter((message) => agents[message.agent.id])
      };
}
