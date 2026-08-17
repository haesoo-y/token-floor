import type { AgentSnapshot } from "@token-floor/protocol";
import { mainWorkSpots, restSpots, subagentWorkSpots } from "./officeLayout.js";

export interface AgentRosterEntry {
  snapshot: AgentSnapshot;
  layoutSlot: number;
  appearanceSlot: number;
  spawnSlot: number;
}

/** Separates physical seat allocation from provider-specific appearance selection. */
export function assignAgentRoster(agents: readonly AgentSnapshot[]): AgentRosterEntry[] {
  const layout = allocateByPool(agents, layoutPool, layoutCapacity);
  const spawn = allocateStable(agents, 36, () => "spawn");
  const appearance = allocateByPool(
    agents,
    (agent) => `${agent.provider}:${agent.kind}`,
    () => 2
  );
  return agents.map((snapshot) => ({
    snapshot,
    layoutSlot: layout.get(snapshot.id) ?? 0,
    appearanceSlot: appearance.get(snapshot.id) ?? 0,
    spawnSlot: spawn.get(snapshot.id) ?? 0
  }));
}

function layoutPool(agent: AgentSnapshot): string {
  return agent.status === "completed" ? "completed" : agent.kind;
}

function layoutCapacity(pool: string): number {
  if (pool === "completed") return restSpots.length;
  return pool === "subagent" ? subagentWorkSpots.length : mainWorkSpots.length;
}

function allocateByPool(
  agents: readonly AgentSnapshot[],
  poolFor: (agent: AgentSnapshot) => string,
  capacityFor: (pool: string) => number
): Map<string, number> {
  const slots = new Map<string, number>();
  for (const pool of new Set(agents.map(poolFor))) {
    const members = agents.filter((agent) => poolFor(agent) === pool);
    const allocated = allocateStable(members, capacityFor(pool), poolFor);
    for (const [id, slot] of allocated) slots.set(id, slot);
  }
  return slots;
}

function allocateStable(
  agents: readonly AgentSnapshot[],
  capacity: number,
  poolFor: (agent: AgentSnapshot) => string
): Map<string, number> {
  const slots = new Map<string, number>();
  const occupied = new Set<number>();
  for (const agent of [...agents].sort((left, right) => left.id.localeCompare(right.id))) {
    let slot = stableHash(`${poolFor(agent)}:${agent.id}`) % capacity;
    while (occupied.has(slot) && occupied.size < capacity) slot = (slot + 1) % capacity;
    slots.set(agent.id, slot);
    occupied.add(slot);
  }
  return slots;
}

function stableHash(value: string): number {
  let result = 2166136261;
  for (const character of value) result = Math.imul(result ^ character.charCodeAt(0), 16777619);
  return result >>> 0;
}
