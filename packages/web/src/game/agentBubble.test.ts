import { describe, expect, it } from "vitest";
import type { AgentSnapshot } from "@token-floor/protocol";
import { agentBubbleProps } from "./agentBubble.js";
import { createAgentSpeechState } from "./agentSpeechState.js";

const completed = { status: "completed" } as AgentSnapshot;

describe("agent bubble placement", () => {
  it("shows scripted idle dialogue only after arrival in the coffee lounge", () => {
    const speech = createAgentSpeechState();
    expect(
      agentBubbleProps("en", completed, { x: 304, y: 256 }, true, "Resting", speech, 0)
    ).toEqual({});
    expect(
      agentBubbleProps("en", completed, { x: 496, y: 256 }, true, "Resting", speech, 0)
    ).toEqual({ bubble: "Resting" });
  });

  it("expires transition speech instead of keeping workspace bubbles forever", () => {
    const active = { status: "active" } as AgentSnapshot;
    const speech = {
      ...createAgentSpeechState(),
      transitionType: "agent.active" as const,
      transitionBubbleUntil: 4_000
    };
    expect(
      agentBubbleProps("en", active, { x: 304, y: 192 }, false, undefined, speech, 3_999)
    ).toEqual({ bubble: "Working" });
    expect(
      agentBubbleProps("en", active, { x: 304, y: 192 }, false, undefined, speech, 4_000)
    ).toEqual({});
  });

  it("prefers the latest assistant message and truncates it to fifty characters", () => {
    const active = {
      status: "active",
      activity: { summary: "Using a local tool" },
      lastMessage: { role: "assistant", text: "가".repeat(60) }
    } as AgentSnapshot;
    const speech = { ...createAgentSpeechState(), assistantBubbleUntil: 5_000 };
    const bubble = agentBubbleProps(
      "ko",
      active,
      { x: 304, y: 192 },
      false,
      undefined,
      speech,
      4_999
    ).bubble!;

    expect(Array.from(bubble)).toHaveLength(50);
    expect(bubble.endsWith("...")).toBe(true);
    expect(bubble).not.toContain("Using a local tool");
  });
});
