import type { AgentSnapshot } from "@token-floor/protocol";
import type { MovingActor } from "./actorRuntime.js";
import type { UsagePatrolState } from "./usagePatrol.js";

export interface AgentActor extends MovingActor {
  snapshot: AgentSnapshot;
  index: number;
  visit: number;
  speed: number;
  pauseMs: number;
  blockedMs: number;
  arrivedAt: number | undefined;
  phrase?: string;
}

export type UsageActor = MovingActor & UsagePatrolState & { provider: "codex" | "claude-code" };
