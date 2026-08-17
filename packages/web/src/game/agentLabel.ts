import type { AgentSnapshot } from "@token-floor/protocol";

export function sessionTag(sessionId: string): string {
  const normalized = sessionId.replace(/[^a-zA-Z0-9]/g, "");
  return normalized.slice(-5).toUpperCase() || "LOCAL";
}

function identityTag(id: string): string {
  let hash = 0;
  for (const character of id) hash = Math.imul(hash ^ character.charCodeAt(0), 31);
  return (hash >>> 0).toString(36).slice(-3).toUpperCase().padStart(3, "0");
}

/** Builds a compact provider, role, and session identifier for crowded rooms. */
export function labelForAgent(agent: AgentSnapshot): string {
  const provider = agent.provider === "claude-code" ? "CLD" : "CDX";
  const role = agent.kind === "subagent" ? "S" : "M";
  return `${provider}-${role}-${sessionTag(agent.sessionId)}-${identityTag(agent.id)}`;
}
