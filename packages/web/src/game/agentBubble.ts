import type { AgentSnapshot } from "@token-floor/protocol";
import type { Locale } from "../lib/i18n.js";
import type { Point } from "../lib/movement.js";
import { isLoungePoint, isWorkspacePoint } from "./officeLayout.js";
import { agentSpeech, transitionSpeech } from "./officeSpeech.js";
import { truncateChatText } from "../lib/chatText.js";
import type { AgentSpeechState } from "./agentSpeechState.js";

/** Keeps scripted idle dialogue in the lounge while preserving task-status speech at work spots. */
export function agentBubbleProps(
  locale: Locale,
  agent: AgentSnapshot,
  point: Point,
  isScheduledSpeaker: boolean,
  idle: string | undefined,
  speech: AgentSpeechState,
  now: number
): { bubble?: string } {
  if (agent.lastMessage && speech.assistantBubbleUntil > now) {
    return { bubble: truncateChatText(agent.lastMessage.text, 50) };
  }
  if (speech.transitionType && speech.transitionBubbleUntil > now) {
    return { bubble: transitionSpeech(locale, speech.transitionType) };
  }
  if (agent.status !== "completed" && isWorkspacePoint(point)) {
    const persistent = agent.lastMessage?.text ?? agentSpeech(locale, agent);
    return { bubble: truncateChatText(persistent, 50) };
  }
  if (agent.status !== "completed") return {};
  if (!isScheduledSpeaker || !isLoungePoint(point)) return {};
  return { bubble: truncateChatText(idle ?? "", 50) };
}
