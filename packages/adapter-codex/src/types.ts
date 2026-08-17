export interface CodexSessionRecord {
  type: "session";
  timestamp: string;
  threadId: string;
  sessionId: string;
  cwd: string;
  kind: "main" | "subagent";
  subagentKind?: string;
  parentThreadId?: string;
  forkedFromId?: string;
}

export type CodexLifecycleRecord =
  | { type: "task.started"; timestamp: string; turnId: string }
  | { type: "task.completed"; timestamp: string; turnId: string }
  | { type: "task.failed"; timestamp: string; turnId?: string }
  | { type: "activity"; timestamp: string; callId: string; turnId?: string }
  | { type: "heartbeat"; timestamp: string; heartbeatId: string }
  | {
      type: "message";
      timestamp: string;
      role: "user" | "assistant";
      text: string;
    }
  | {
      type: "waiting";
      timestamp: string;
      callId: string;
      turnId?: string;
      reason: "input" | "permission";
    }
  | {
      type: "subagent.activity";
      timestamp: string;
      eventId: string;
      childThreadId: string;
      state: "started" | "active" | "failed";
    };

export type CodexRecord = CodexSessionRecord | CodexLifecycleRecord;
