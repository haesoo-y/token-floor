import type { AgentSnapshot } from "@token-floor/protocol";

export interface AgentBehavior {
  speed: number;
  pauseMs: number;
}

/** Creates stable but visibly different pacing, with extra variance for subagents. */
export function behaviorForAgent(agent: AgentSnapshot, index: number): AgentBehavior {
  const seed = hash(`${agent.id}:${index}`);
  if (agent.kind === "subagent") {
    return { speed: 0.055 + (seed % 5) * 0.009, pauseMs: 9000 + (seed % 7) * 900 };
  }
  return { speed: 0.062 + (seed % 3) * 0.006, pauseMs: 11000 + (seed % 5) * 1100 };
}

function hash(value: string): number {
  let result = 2166136261;
  for (const character of value) result = Math.imul(result ^ character.charCodeAt(0), 16777619);
  return result >>> 0;
}
