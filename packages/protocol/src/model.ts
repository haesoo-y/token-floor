export const EVENT_SCHEMA_VERSION = 1 as const;

export type AgentStatus = "active" | "waiting" | "completed" | "error";
export type AgentKind = "main" | "subagent";
export type WaitReason = "input" | "permission";
export type UsageCapability = "weekly-percentage" | "unavailable";

export interface ProviderCapabilities {
  lifecycle: boolean;
  subagents: boolean;
  transcriptRecovery: boolean;
  usage: UsageCapability;
}

export interface ProjectIdentity {
  id: string;
  label: string;
}

export interface AgentIdentity {
  id: string;
  kind: AgentKind;
  parentId?: string;
}

interface EventBase {
  schemaVersion: typeof EVENT_SCHEMA_VERSION;
  eventId: string;
  occurredAt: string;
  provider: string;
  sessionId: string;
}

interface AgentEventBase extends EventBase {
  agent: AgentIdentity;
  project: ProjectIdentity;
}

export interface AgentStartedEvent extends AgentEventBase {
  type: "agent.started";
}

export interface AgentActiveEvent extends AgentEventBase {
  type: "agent.active";
  activity: { tool?: string; summary?: string };
}

export interface AgentWaitingEvent extends AgentEventBase {
  type: "agent.waiting";
  reason: WaitReason;
}

export interface AgentCompletedEvent extends AgentEventBase {
  type: "agent.completed";
  inferred: boolean;
}

export interface AgentFailedEvent extends AgentEventBase {
  type: "agent.failed";
  error: { code?: string; message: string };
}

export interface UsageUpdatedEvent extends EventBase {
  type: "usage.updated";
  usage: {
    capability: UsageCapability;
    remainingPercent?: number;
    resetsAt?: string;
    unavailableReason?: string;
  };
}

export type AgentEvent =
  AgentStartedEvent | AgentActiveEvent | AgentWaitingEvent | AgentCompletedEvent | AgentFailedEvent;

export type NormalizedEvent = AgentEvent | UsageUpdatedEvent;

export function isAgentEvent(event: NormalizedEvent): event is AgentEvent {
  return event.type.startsWith("agent.");
}
