import type { AgentSnapshot, AgentStatus } from "@token-floor/protocol";

export type AgentStats = Record<AgentStatus, number>;

export function countAgentStatuses(agents: Record<string, AgentSnapshot>): AgentStats {
  const stats: AgentStats = { active: 0, waiting: 0, completed: 0, error: 0 };
  for (const agent of Object.values(agents)) stats[agent.status] += 1;
  return stats;
}
