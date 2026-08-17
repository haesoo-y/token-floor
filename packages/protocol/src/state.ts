import type {
  AgentChatMessage,
  AgentEvent,
  AgentMessageEvent,
  AgentStatus,
  NormalizedEvent,
  ProviderSourceSnapshot,
  UsageUpdatedEvent
} from "./model.js";
import { isAgentEvent } from "./model.js";

export const MAX_CHAT_LOG_ENTRIES = 100;
export const MAX_EVENT_LOG_ENTRIES = 100;

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
  completedAt?: string;
  lastEventId: string;
  lastEventType: Exclude<AgentEvent["type"], "agent.message">;
  activity?: { tool?: string; summary?: string };
  lastMessage?: AgentChatMessage;
  lastMessageAt?: string;
  lastMessageEventId?: string;
  waitReason?: "input" | "permission";
  error?: { code?: string; message: string };
}

export type UsageSnapshot = UsageUpdatedEvent["usage"] & { checkedAt: string };

export interface OfficeState {
  agents: Record<string, AgentSnapshot>;
  usageByProvider: Record<string, UsageSnapshot>;
  sourceStatusByProvider: Record<string, ProviderSourceSnapshot>;
  messages: AgentMessageEvent[];
  recentEvents: NormalizedEvent[];
}

export function createOfficeState(): OfficeState {
  return {
    agents: {},
    usageByProvider: {},
    sourceStatusByProvider: {},
    messages: [],
    recentEvents: []
  };
}

function recordRecentEvent(state: OfficeState, event: NormalizedEvent): OfficeState {
  if (event.type === "agent.message") return state;
  const recentEvents = state.recentEvents ?? [];
  if (recentEvents.some((recent) => recent.eventId === event.eventId)) return state;
  return {
    ...state,
    recentEvents: [event, ...recentEvents].slice(0, MAX_EVENT_LOG_ENTRIES)
  };
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
    inferredCompletion: event.type === "agent.completed" && event.inferred,
    lastEventId: event.eventId,
    lastEventType: event.type
  };
  if (event.agent.parentId !== undefined) base.parentId = event.agent.parentId;
  if (event.agent.executionId !== undefined) base.executionId = event.agent.executionId;
  if (event.agent.role !== undefined) base.role = event.agent.role;
  if (event.type === "agent.active") base.activity = event.activity;
  if (event.type === "agent.waiting") base.waitReason = event.reason;
  if (event.type === "agent.failed") base.error = event.error;
  if (event.type === "agent.completed") base.completedAt = event.occurredAt;
  if (previous?.lastMessage) {
    base.lastMessage = previous.lastMessage;
    if (previous.lastMessageAt) base.lastMessageAt = previous.lastMessageAt;
    if (previous.lastMessageEventId) base.lastMessageEventId = previous.lastMessageEventId;
  }

  // Each event is a full projection, so stale wait, error, and activity details are discarded.
  return base;
}

/**
 * Projects one normalized event into immutable office state.
 *
 * Older agent events are ignored so delayed adapter output cannot roll the UI back.
 */
export function applyEvent(state: OfficeState, event: NormalizedEvent): OfficeState {
  if ((state.recentEvents ?? []).some((recent) => recent.eventId === event.eventId)) return state;
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
      agents[event.agent.id] = {
        ...previous,
        lastMessage: event.message,
        lastMessageAt: event.occurredAt,
        lastMessageEventId: event.eventId
      };
    } else if (previous) {
      const withoutLastMessage = { ...previous };
      delete withoutLastMessage.lastMessage;
      agents[event.agent.id] = withoutLastMessage;
      delete agents[event.agent.id]!.lastMessageAt;
      delete agents[event.agent.id]!.lastMessageEventId;
    }
    return {
      ...state,
      agents,
      messages: [event, ...messages].slice(0, MAX_CHAT_LOG_ENTRIES)
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

export {
  DEFAULT_COMPLETED_RETENTION_MS,
  DEFAULT_COMPLETION_TIMEOUT_MS,
  inferTimedOutCompletions,
  pruneCompletedAgents
} from "./state-maintenance.js";
