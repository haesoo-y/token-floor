import type { AgentSnapshot } from "@token-floor/protocol";

export const TRANSITION_BUBBLE_MS = 4_000;
export const ASSISTANT_BUBBLE_MS = 5_000;

export interface AgentSpeechState {
  observedTransitionKey?: string;
  observedMessageId?: string;
  transitionBubbleUntil: number;
  assistantBubbleUntil: number;
  transitionType?: AgentSnapshot["lastEventType"];
}

export function createAgentSpeechState(): AgentSpeechState {
  return { transitionBubbleUntil: 0, assistantBubbleUntil: 0 };
}

/** Starts each bubble lifetime once per normalized event, even if a snapshot is replayed. */
export function syncAgentSpeechState(
  state: AgentSpeechState,
  snapshot: AgentSnapshot,
  now: number
): void {
  const transitionKey = `${snapshot.lastEventId}:${snapshot.lastEventType}:${snapshot.completedAt ?? ""}`;
  if (state.observedTransitionKey !== transitionKey) {
    state.observedTransitionKey = transitionKey;
    state.transitionType = snapshot.lastEventType;
    state.transitionBubbleUntil = now + TRANSITION_BUBBLE_MS;
  }
  if (snapshot.lastMessageEventId && state.observedMessageId !== snapshot.lastMessageEventId) {
    state.observedMessageId = snapshot.lastMessageEventId;
    state.assistantBubbleUntil = now + ASSISTANT_BUBBLE_MS;
  }
}
