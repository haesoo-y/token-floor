import { describe, expect, it } from "vitest";
import type { AgentSnapshot } from "@token-floor/protocol";
import {
  ASSISTANT_BUBBLE_MS,
  TRANSITION_BUBBLE_MS,
  createAgentSpeechState,
  syncAgentSpeechState
} from "./agentSpeechState.js";

const snapshot = {
  lastEventId: "event-1",
  lastEventType: "agent.waiting",
  lastMessageEventId: "message-1"
} as AgentSnapshot;

describe("agent speech lifetimes", () => {
  it("uses bounded transition and assistant lifetimes", () => {
    const state = createAgentSpeechState();
    syncAgentSpeechState(state, snapshot, 100);
    expect(state.transitionBubbleUntil).toBe(100 + TRANSITION_BUBBLE_MS);
    expect(state.assistantBubbleUntil).toBe(100 + ASSISTANT_BUBBLE_MS);
  });

  it("does not reset timers when the same snapshot is replayed", () => {
    const state = createAgentSpeechState();
    syncAgentSpeechState(state, snapshot, 100);
    syncAgentSpeechState(state, snapshot, 2_000);
    expect(state.transitionBubbleUntil).toBe(4_100);
    expect(state.assistantBubbleUntil).toBe(5_100);
  });
});
