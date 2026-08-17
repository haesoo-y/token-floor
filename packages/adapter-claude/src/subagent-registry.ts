import type { NormalizedEvent } from "@token-floor/protocol";

interface SlotAssignment {
  actorId: string;
  slot: number;
}

function executionKey(sessionId: string, executionId: string): string {
  return `${sessionId}:${executionId}`;
}

function slotFromActorId(actorId: string): number | undefined {
  const match = actorId.match(/:sub:(\d+)$/);
  return match ? Number(match[1]) : undefined;
}

/** Reuses physical subagent actors while retaining provider execution correlation. */
export class ClaudeSubagentRegistry {
  private readonly assignments = new Map<string, SlotAssignment>();
  private readonly completed = new Set<string>();
  private readonly occupiedBySession = new Map<string, Set<number>>();

  static fromEvents(events: readonly NormalizedEvent[]): ClaudeSubagentRegistry {
    const registry = new ClaudeSubagentRegistry();
    for (const event of events) {
      if (event.type === "usage.updated" || event.agent.kind !== "subagent") continue;
      const executionId = event.agent.executionId;
      const slot = slotFromActorId(event.agent.id);
      if (executionId === undefined || slot === undefined) continue;
      registry.restore(event.sessionId, executionId, event.agent.id, slot);
      if (event.type === "agent.completed" || event.type === "agent.failed") {
        registry.release(event.sessionId, executionId);
      }
    }
    return registry;
  }

  resolve(sessionId: string, executionId: string): SlotAssignment {
    const key = executionKey(sessionId, executionId);
    const existing = this.assignments.get(key);
    if (existing) return existing;
    const occupied = this.occupiedBySession.get(sessionId) ?? new Set<number>();
    let slot = 0;
    while (occupied.has(slot)) slot += 1;
    const assignment = { actorId: `claude:${sessionId}:sub:${slot}`, slot };
    this.restore(sessionId, executionId, assignment.actorId, slot);
    return assignment;
  }

  release(sessionId: string, executionId: string): void {
    const key = executionKey(sessionId, executionId);
    const assignment = this.assignments.get(key);
    if (!assignment) return;
    this.completed.add(key);
    this.occupiedBySession.get(sessionId)?.delete(assignment.slot);
  }

  isCompleted(sessionId: string, executionId: string): boolean {
    return this.completed.has(executionKey(sessionId, executionId));
  }

  private restore(sessionId: string, executionId: string, actorId: string, slot: number): void {
    this.assignments.set(executionKey(sessionId, executionId), { actorId, slot });
    this.completed.delete(executionKey(sessionId, executionId));
    const occupied = this.occupiedBySession.get(sessionId) ?? new Set<number>();
    occupied.add(slot);
    this.occupiedBySession.set(sessionId, occupied);
  }
}
