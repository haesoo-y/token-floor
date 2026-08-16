export interface ClaudeHookInput {
  session_id: string;
  transcript_path: string;
  cwd: string;
  hook_event_name: string;
  agent_id?: string;
  agent_type?: string;
  tool_name?: string;
  tool_use_id?: string;
  notification_type?: string;
  stop_hook_active?: boolean;
  background_tasks?: unknown[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Validates the stable Claude hook envelope while leaving event-specific fields optional. */
export function parseClaudeHookInput(value: unknown): ClaudeHookInput {
  if (!isRecord(value)) throw new Error("Invalid Claude hook payload");
  for (const key of ["session_id", "transcript_path", "cwd", "hook_event_name"] as const) {
    if (typeof value[key] !== "string" || value[key].length === 0) {
      throw new Error(`Invalid Claude hook field: ${key}`);
    }
  }
  return value as unknown as ClaudeHookInput;
}
