import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CodexSessionCollector } from "./codex-session-source.js";

const roots: string[] = [];
const at = "2026-08-17T01:00:00.000Z";

function root(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "token-floor-codex-"));
  roots.push(directory);
  return directory;
}

function meta(id: string, kind: "main" | "subagent" = "main") {
  return {
    type: "session_meta",
    timestamp: at,
    payload: {
      id,
      session_id: "group-1",
      timestamp: at,
      cwd: "/workspace/token-floor",
      source: kind === "subagent" ? { subagent: { thread_spawn: true } } : "app"
    }
  };
}

function line(value: unknown): string {
  return `${JSON.stringify(value)}\n`;
}

function task(type: "task_started" | "task_complete" | "turn_aborted", turnId = "turn-1") {
  return { type: "event_msg", timestamp: at, payload: { type, turn_id: turnId } };
}

function message(role: "user_message" | "agent_message", text: string) {
  return { type: "event_msg", timestamp: at, payload: { type: role, message: text } };
}

afterEach(() => {
  for (const directory of roots.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

describe("CodexSessionCollector", () => {
  it("recovers an active main execution and is idempotent", () => {
    const directory = root();
    fs.writeFileSync(
      path.join(directory, "main.jsonl"),
      line(meta("main")) + line(task("task_started"))
    );
    const collector = new CodexSessionCollector(directory);
    const events = collector.poll(new Date(at));
    expect(events.map((event) => event.type)).toEqual(["agent.active"]);
    expect(collector.poll(new Date(at))).toEqual([]);
  });

  it("recovers bounded chat after admitting the lifecycle actor", () => {
    const directory = root();
    fs.writeFileSync(
      path.join(directory, "chat.jsonl"),
      line(meta("chat")) +
        line(task("task_started")) +
        line(message("user_message", "Please update the panel.")) +
        line(message("agent_message", "The panel now includes the chat log."))
    );
    const events = new CodexSessionCollector(directory).poll(new Date(at));

    expect(events.map((event) => event.type)).toEqual([
      "agent.active",
      "agent.message",
      "agent.message"
    ]);
    expect(events.at(-1)).toMatchObject({
      type: "agent.message",
      message: { role: "assistant", text: "The panel now includes the chat log." }
    });
  });

  it("recovers an already completed execution after restart", () => {
    const directory = root();
    fs.writeFileSync(
      path.join(directory, "done.jsonl"),
      line(meta("done")) + line(task("task_started")) + line(task("task_complete"))
    );
    const events = new CodexSessionCollector(directory).poll(new Date(at));
    expect(events.at(-1)?.type).toBe("agent.completed");
  });

  it("holds a partial final row until the next poll", () => {
    const directory = root();
    const filename = path.join(directory, "partial.jsonl");
    fs.writeFileSync(filename, line(meta("partial")) + JSON.stringify(task("task_started")));
    const collector = new CodexSessionCollector(directory);
    expect(collector.poll(new Date(at)).map((event) => event.type)).toEqual(["agent.started"]);
    fs.appendFileSync(filename, "\n");
    expect(collector.poll(new Date(at)).map((event) => event.type)).toEqual(["agent.active"]);
  });

  it("ignores malformed rows while recovering later records", () => {
    const directory = root();
    fs.writeFileSync(
      path.join(directory, "malformed.jsonl"),
      line(meta("safe")) + "{broken\n" + line(task("task_started"))
    );
    expect(new CodexSessionCollector(directory).poll(new Date(at)).at(-1)?.type).toBe(
      "agent.active"
    );
  });

  it("isolates one unreadable file from another session", () => {
    const directory = root();
    const unreadable = path.join(directory, "unreadable.jsonl");
    fs.writeFileSync(unreadable, line(meta("blocked")));
    fs.chmodSync(unreadable, 0o000);
    fs.writeFileSync(
      path.join(directory, "valid.jsonl"),
      line(meta("valid")) + line(task("task_started"))
    );
    try {
      const events = new CodexSessionCollector(directory).poll(new Date(at));
      expect(events.some((event) => event.agent.id === "codex:valid")).toBe(true);
    } finally {
      fs.chmodSync(unreadable, 0o600);
    }
  });

  it("continues when a file is deleted between discovery and reading", () => {
    const directory = root();
    const removed = path.join(directory, "removed.jsonl");
    fs.writeFileSync(removed, line(meta("removed")));
    fs.writeFileSync(
      path.join(directory, "survivor.jsonl"),
      line(meta("survivor")) + line(task("task_started"))
    );
    const statSync = fs.statSync.bind(fs);
    let removedDuringStat = false;
    const spy = vi.spyOn(fs, "statSync").mockImplementation((filename, options) => {
      const result = statSync(filename, options as never);
      if (String(filename) === removed && !removedDuringStat) {
        removedDuringStat = true;
        fs.unlinkSync(removed);
      }
      return result;
    });
    try {
      const events = new CodexSessionCollector(directory).poll(new Date(at));
      expect(events.some((event) => event.agent.id === "codex:survivor")).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });

  it("recovers distinct subagents and their observed parent", () => {
    const directory = root();
    const parent = path.join(directory, "parent.jsonl");
    const child = path.join(directory, "child.jsonl");
    const activity = {
      type: "event_msg",
      timestamp: at,
      payload: {
        type: "sub_agent_activity",
        event_id: "spawn-1",
        agent_thread_id: "child",
        kind: "started",
        occurred_at_ms: 1
      }
    };
    fs.writeFileSync(parent, line(meta("parent")) + line(task("task_started")) + line(activity));
    fs.writeFileSync(
      child,
      line(meta("child", "subagent")) + line(task("task_started", "child-turn"))
    );
    const events = new CodexSessionCollector(directory).poll(new Date(at));
    const childEvent = events.find(
      (event) => event.agent.id === "codex:child" && event.agent.parentId
    );
    expect(childEvent?.agent.parentId).toBe("codex:parent");
  });

  it("recovers after a file is truncated and replaced", () => {
    const directory = root();
    const filename = path.join(directory, "changing.jsonl");
    fs.writeFileSync(filename, line(meta("first")) + line(task("task_started")));
    const collector = new CodexSessionCollector(directory);
    collector.poll(new Date(at));
    fs.writeFileSync(filename, line(meta("second")));
    expect(collector.poll(new Date(at)).some((event) => event.agent.id === "codex:second")).toBe(
      true
    );
  });
});
