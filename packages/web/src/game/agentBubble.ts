import type { AgentSnapshot } from "@token-floor/protocol";
import type { Locale } from "../lib/i18n.js";
import type { Point } from "../lib/movement.js";
import { isLoungePoint } from "./officeLayout.js";
import { agentSpeech } from "./officeSpeech.js";
import { truncateChatText } from "../lib/chatText.js";

/** Keeps scripted idle dialogue in the lounge while preserving task-status speech at work spots. */
export function agentBubbleProps(
  locale: Locale,
  agent: AgentSnapshot,
  point: Point,
  isScheduledSpeaker: boolean,
  idle?: string
): { bubble?: string } {
  if (agent.status !== "completed") {
    return { bubble: truncateChatText(agentSpeech(locale, agent, idle), 50) };
  }
  if (!isScheduledSpeaker || !isLoungePoint(point)) return {};
  return { bubble: truncateChatText(agentSpeech(locale, agent, idle), 50) };
}
