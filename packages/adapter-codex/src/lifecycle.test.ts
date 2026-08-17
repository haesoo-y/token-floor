import { describe, expect, it } from "vitest";
import { decodeCodexRecord } from "./decode.js";
import { CodexLifecycleNormalizer } from "./normalize.js";
import type { CodexSessionRecord } from "./types.js";

const at = "2026-08-17T01:00:00.000Z";
const main: CodexSessionRecord = {
  type: "session",
  timestamp: at,
  threadId: "main-thread",
  sessionId: "session-group",
  cwd: "/workspace/token-floor",
  kind: "main"
};

function eventRecord(payload: Record<string, unknown>) {
  return { type: "event_msg", timestamp: at, payload };
}

describe("Codex lifecycle decoding", () => {
  it("decodes lifecycle states without returning tool content", () => {
    expect(decodeCodexRecord(eventRecord({ type: "task_started", turn_id: "turn-1" }))?.type).toBe(
      "task.started"
    );
    expect(decodeCodexRecord(eventRecord({ type: "task_complete", turn_id: "turn-1" }))?.type).toBe(
      "task.completed"
    );
    expect(decodeCodexRecord(eventRecord({ type: "turn_aborted", turn_id: "turn-1" }))?.type).toBe(
      "task.failed"
    );
    expect(
      decodeCodexRecord({
        type: "response_item",
        timestamp: at,
        payload: {
          type: "custom_tool_call",
          call_id: "call-1",
          input: "request_user_input with private material"
        }
      })
    ).toEqual({ type: "waiting", timestamp: at, callId: "call-1", reason: "input" });
  });

  it("decodes visible user and agent messages without tool payloads", () => {
    expect(
      decodeCodexRecord(eventRecord({ type: "agent_message", message: "Finished the change." }))
    ).toMatchObject({ type: "message", role: "assistant", text: "Finished the change." });
    expect(
      decodeCodexRecord(eventRecord({ type: "user_message", message: "Please update it." }))
    ).toMatchObject({ type: "message", role: "user", text: "Please update it." });
  });

  it("identifies provider-internal guardian sessions from structural metadata", () => {
    expect(
      decodeCodexRecord({
        type: "session_meta",
        timestamp: at,
        payload: {
          id: "guardian-thread",
          timestamp: at,
          cwd: "/workspace/token-floor",
          source: { subagent: { other: "guardian" } }
        }
      })
    ).toMatchObject({ type: "session", kind: "subagent", subagentKind: "guardian" });
  });

  it("distinguishes permission waits from ordinary local tool activity", () => {
    const permission = decodeCodexRecord({
      type: "response_item",
      timestamp: at,
      payload: { type: "function_call", call_id: "call-2", arguments: "require_escalated" }
    });
    const active = decodeCodexRecord({
      type: "response_item",
      timestamp: at,
      payload: { type: "function_call", call_id: "call-3", arguments: "safe local read" }
    });
    expect(permission?.type).toBe("waiting");
    expect(active?.type).toBe("activity");
    expect(JSON.stringify(permission)).not.toContain("private material");
  });

  it("decodes Codex work heartbeats without retaining sensitive payloads", () => {
    const records = [
      eventRecord({
        type: "mcp_tool_call_begin",
        call_id: "call-4",
        invocation: { arguments: "private tool input" }
      }),
      eventRecord({
        type: "mcp_tool_call_end",
        call_id: "call-4",
        result: "private tool output"
      }),
      eventRecord({ type: "agent_reasoning", text: "private chain of thought" })
    ].map(decodeCodexRecord);

    expect(records).toEqual([
      {
        type: "heartbeat",
        timestamp: at,
        heartbeatId: "mcp_tool_call_begin:call-4"
      },
      { type: "heartbeat", timestamp: at, heartbeatId: "mcp_tool_call_end:call-4" },
      { type: "heartbeat", timestamp: at, heartbeatId: `agent_reasoning:${at}` }
    ]);
    expect(JSON.stringify(records)).not.toMatch(/private|invocation|result|text/);
  });
});

describe("Codex lifecycle normalization", () => {
  it("keeps repeated records on one actor and gives new executions new actors", () => {
    const normalizer = new CodexLifecycleNormalizer();
    normalizer.registerSession("main", main);
    normalizer.registerSession("other", { ...main, threadId: "other-thread" });
    const started = normalizer.sessionStarted("main")!;
    const active = normalizer.normalize("main", {
      type: "task.started",
      timestamp: at,
      turnId: "turn-1"
    })[0]!;
    const later = normalizer.normalize("main", {
      type: "task.started",
      timestamp: "2026-08-17T01:00:01.000Z",
      turnId: "turn-2"
    })[0]!;
    expect(active.agent.id).toBe(started.agent.id);
    expect(later.agent.id).toBe(started.agent.id);
    expect(normalizer.sessionStarted("other")!.agent.id).not.toBe(started.agent.id);
    expect(active.agent.executionId).toBe("main-thread");
  });

  it("normalizes active, waiting, completed, and error transitions", () => {
    const normalizer = new CodexLifecycleNormalizer();
    normalizer.registerSession("main", main);
    const records = [
      { type: "task.started" as const, timestamp: at, turnId: "turn-1" },
      { type: "waiting" as const, timestamp: at, callId: "call-1", reason: "permission" as const },
      { type: "task.completed" as const, timestamp: at, turnId: "turn-1" },
      { type: "task.failed" as const, timestamp: at, turnId: "turn-2" }
    ];
    expect(records.map((record) => normalizer.normalize("main", record)[0]?.type)).toEqual([
      "agent.active",
      "agent.waiting",
      "agent.completed",
      "agent.failed"
    ]);
  });

  it("normalizes and bounds visible chat without provider payload fields", () => {
    const normalizer = new CodexLifecycleNormalizer();
    normalizer.registerSession("main", main);
    const event = normalizer.normalize("main", {
      type: "message",
      timestamp: at,
      role: "assistant",
      text: "x".repeat(240)
    })[0]!;

    expect(event.type).toBe("agent.message");
    expect(event).not.toHaveProperty("payload");
    if (event.type === "agent.message") expect(event.message.text.length).toBeLessThanOrEqual(200);
  });

  it("hides guardian activity and subagent orchestration prompts", () => {
    const normalizer = new CodexLifecycleNormalizer();
    normalizer.registerSession("guardian", {
      ...main,
      threadId: "guardian-thread",
      kind: "subagent",
      subagentKind: "guardian"
    });
    normalizer.registerSession("worker", {
      ...main,
      threadId: "worker-thread",
      kind: "subagent"
    });
    const prompt = { type: "message" as const, timestamp: at, role: "user" as const, text: "Run" };
    expect(normalizer.sessionStarted("guardian")).toBeUndefined();
    expect(normalizer.normalize("guardian", prompt)).toEqual([]);
    expect(normalizer.normalize("worker", prompt)).toEqual([]);
    expect(
      normalizer.normalize("worker", { ...prompt, role: "assistant", text: "Done" })[0]?.type
    ).toBe("agent.message");
  });

  it("keeps local tool work active and returns to active when a user wait finishes", () => {
    const normalizer = new CodexLifecycleNormalizer();
    normalizer.registerSession("main", main);
    expect(
      normalizer.normalize("main", {
        type: "activity",
        timestamp: at,
        callId: "ordinary-call"
      })[0]?.type
    ).toBe("agent.active");
    normalizer.normalize("main", {
      type: "waiting",
      timestamp: at,
      callId: "waiting-call",
      reason: "input"
    });
    expect(
      normalizer.normalize("main", {
        type: "activity",
        timestamp: "2026-08-17T01:00:01.000Z",
        callId: "waiting-call"
      })[0]?.type
    ).toBe("agent.active");
  });

  it("normalizes payload-free heartbeats once as provider-neutral active events", () => {
    const normalizer = new CodexLifecycleNormalizer();
    normalizer.registerSession("main", main);
    const heartbeat = {
      type: "heartbeat" as const,
      timestamp: "2026-08-17T01:04:30.000Z",
      heartbeatId: "mcp_tool_call_end:call-4"
    };
    const event = normalizer.normalize("main", heartbeat)[0]!;

    expect(event).toMatchObject({
      type: "agent.active",
      occurredAt: heartbeat.timestamp,
      activity: { summary: "Working" }
    });
    expect(event).not.toHaveProperty("heartbeatId");
    expect(normalizer.normalize("main", heartbeat)).toEqual([]);
  });

  it("links distinct subagents to the observed parent execution", () => {
    const normalizer = new CodexLifecycleNormalizer();
    normalizer.registerSession("main", main);
    for (const threadId of ["child-a", "child-b"]) {
      normalizer.registerSession(threadId, {
        ...main,
        threadId,
        sessionId: main.sessionId,
        kind: "subagent",
        parentThreadId: main.sessionId
      });
      normalizer.normalize("main", {
        type: "subagent.activity",
        timestamp: at,
        eventId: `spawn-${threadId}`,
        childThreadId: threadId,
        state: "started"
      });
    }
    const childA = normalizer.sessionStarted("child-a")!;
    const childB = normalizer.sessionStarted("child-b")!;
    expect(childA.agent.parentId).toBe("codex:main-thread");
    expect(childB.agent.parentId).toBe("codex:main-thread");
    expect(childA.agent.id).not.toBe(childB.agent.id);
  });

  it("leaves an ambiguous parent explicitly unlinked", () => {
    const normalizer = new CodexLifecycleNormalizer();
    normalizer.registerSession("main-a", main);
    normalizer.registerSession("main-b", { ...main, threadId: "main-b" });
    normalizer.registerSession("child", {
      ...main,
      threadId: "child",
      kind: "subagent",
      parentThreadId: main.sessionId
    });
    expect(normalizer.sessionStarted("child")!.agent.parentId).toBeUndefined();
  });

  it("does not leak provider records into the normalized contract", () => {
    const normalizer = new CodexLifecycleNormalizer();
    normalizer.registerSession("main", main);
    const event = normalizer.normalize("main", {
      type: "task.started",
      timestamp: at,
      turnId: "provider-turn"
    })[0]!;
    expect(event).not.toHaveProperty("payload");
    expect(event).not.toHaveProperty("source");
    expect(event.activity).toEqual({ summary: "Working" });
  });
});
