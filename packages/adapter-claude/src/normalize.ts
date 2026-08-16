import path from "node:path";
import { sanitizeSpeech, type AgentEvent } from "@token-floor/protocol";
import { parseClaudeHookInput, type ClaudeHookInput } from "./types.js";

function identity(input: ClaudeHookInput) {
  const isSubagent = input.agent_id !== undefined;
  return {
    id: isSubagent ? `claude:${input.session_id}:${input.agent_id}` : `claude:${input.session_id}`,
    kind: isSubagent ? ("subagent" as const) : ("main" as const),
    ...(isSubagent ? { parentId: `claude:${input.session_id}` } : {})
  };
}

function eventBase(input: ClaudeHookInput, occurredAt: string) {
  const agent = identity(input);
  const discriminator = input.tool_use_id ?? input.agent_id ?? input.hook_event_name;
  return {
    schemaVersion: 1 as const,
    eventId: `claude:${input.session_id}:${input.hook_event_name}:${discriminator}:${occurredAt}`,
    occurredAt,
    provider: "claude-code",
    sessionId: input.session_id,
    agent,
    project: { id: input.cwd, label: path.basename(input.cwd) || input.cwd }
  };
}

function activitySummary(input: ClaudeHookInput): string {
  if (input.hook_event_name === "UserPromptSubmit") return "Processing a new request";
  if (input.hook_event_name === "PostToolUseFailure") return `${input.tool_name ?? "Tool"} failed`;
  if (input.hook_event_name === "Stop" && input.background_tasks?.length) {
    return "Waiting for background work";
  }
  return input.tool_name ? `Using ${input.tool_name}` : "Working";
}

/**
 * Converts one untrusted Claude lifecycle hook into the provider-neutral event contract.
 * Raw prompts, tool inputs, commands, and assistant responses are deliberately never projected.
 */
export function normalizeClaudeHook(value: unknown, now = new Date()): AgentEvent | undefined {
  const input = parseClaudeHookInput(value);
  const base = eventBase(input, now.toISOString());
  switch (input.hook_event_name) {
    case "SessionStart":
    case "SubagentStart":
      return { ...base, type: "agent.started" };
    case "PermissionRequest":
      return { ...base, type: "agent.waiting", reason: "permission" };
    case "Notification":
      return input.notification_type === "permission_prompt"
        ? { ...base, type: "agent.waiting", reason: "permission" }
        : undefined;
    case "StopFailure":
      return { ...base, type: "agent.failed", error: { message: "Claude request failed" } };
    case "SessionEnd":
    case "SubagentStop":
      return { ...base, type: "agent.completed", inferred: false };
    case "Stop":
      if (!input.background_tasks?.length) {
        return { ...base, type: "agent.completed", inferred: false };
      }
      break;
  }
  const summary = sanitizeSpeech(activitySummary(input));
  const activity = { ...(input.tool_name ? { tool: input.tool_name } : {}), summary };
  return { ...base, type: "agent.active", activity };
}
