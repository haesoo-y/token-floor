import {
  createOpaqueProjectIdentity,
  sanitizeSpeech,
  type AgentEvent
} from "@token-floor/protocol";
import { ClaudeSubagentRegistry } from "./subagent-registry.js";
import { parseClaudeHookInput, type ClaudeHookInput } from "./types.js";

function identity(input: ClaudeHookInput, registry: ClaudeSubagentRegistry) {
  const isSubagent = input.agent_id !== undefined;
  if (isSubagent) {
    const executionId = input.agent_id as string;
    const assignment = registry.resolve(input.session_id, executionId);
    return {
      id: assignment.actorId,
      kind: "subagent" as const,
      parentId: `claude:${input.session_id}`,
      executionId,
      ...(input.agent_type ? { role: input.agent_type } : {})
    };
  }
  return {
    id: `claude:${input.session_id}`,
    kind: "main" as const,
    executionId: input.session_id
  };
}

function eventBase(input: ClaudeHookInput, occurredAt: string, registry: ClaudeSubagentRegistry) {
  const agent = identity(input, registry);
  const discriminator = input.tool_use_id ?? input.agent_id ?? input.hook_event_name;
  return {
    schemaVersion: 1 as const,
    eventId: `claude:${input.session_id}:${input.hook_event_name}:${discriminator}:${occurredAt}`,
    occurredAt,
    provider: "claude-code",
    sessionId: input.session_id,
    agent,
    project: createOpaqueProjectIdentity("claude-code", input.cwd)
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
export function normalizeClaudeHook(
  value: unknown,
  now = new Date(),
  registry = new ClaudeSubagentRegistry()
): AgentEvent | undefined {
  const input = parseClaudeHookInput(value);
  if (
    input.agent_id &&
    registry.isCompleted(input.session_id, input.agent_id) &&
    input.hook_event_name !== "SubagentStop"
  ) {
    return undefined;
  }
  const base = eventBase(input, now.toISOString(), registry);
  const terminalSubagent = () => {
    if (input.agent_id) registry.release(input.session_id, input.agent_id);
    return { ...base, type: "agent.completed" as const, inferred: false };
  };
  switch (input.hook_event_name) {
    case "SessionStart":
      return undefined;
    case "SubagentStart":
      return { ...base, type: "agent.started" };
    case "PermissionRequest":
      return { ...base, type: "agent.waiting", reason: "permission" };
    case "Notification":
      return input.notification_type === "permission_prompt"
        ? { ...base, type: "agent.waiting", reason: "permission" }
        : undefined;
    case "StopFailure":
      if (input.agent_id) registry.release(input.session_id, input.agent_id);
      return { ...base, type: "agent.failed", error: { message: "Claude request failed" } };
    case "SessionEnd":
      return { ...base, type: "agent.completed", inferred: false };
    case "SubagentStop":
      return terminalSubagent();
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
