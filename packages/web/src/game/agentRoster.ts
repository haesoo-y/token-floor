import type { AgentSnapshot } from "@token-floor/protocol";

export interface AgentRosterEntry {
  snapshot: AgentSnapshot;
  layoutSlot: number;
  appearanceSlot: number;
  spawnSlot: number;
}

/** Separates physical seat allocation from provider-specific appearance selection. */
export function assignAgentRoster(agents: readonly AgentSnapshot[]): AgentRosterEntry[] {
  const layoutSlots = new Map<string, number>();
  const appearanceSlots = new Map<string, number>();
  return agents.map((snapshot, spawnSlot) => {
    const layoutKey = snapshot.status === "completed" ? "completed" : snapshot.kind;
    const appearanceKey = `${snapshot.provider}:${snapshot.kind}`;
    const layoutSlot = layoutSlots.get(layoutKey) ?? 0;
    const appearanceSlot = appearanceSlots.get(appearanceKey) ?? 0;
    layoutSlots.set(layoutKey, layoutSlot + 1);
    appearanceSlots.set(appearanceKey, appearanceSlot + 1);
    return { snapshot, layoutSlot, appearanceSlot, spawnSlot };
  });
}
