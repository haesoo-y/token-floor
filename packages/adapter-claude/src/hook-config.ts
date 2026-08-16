const observedEvents = [
  "SessionStart",
  "UserPromptSubmit",
  "PreToolUse",
  "PostToolUse",
  "PostToolUseFailure",
  "PermissionRequest",
  "Notification",
  "SubagentStart",
  "SubagentStop",
  "Stop",
  "StopFailure",
  "SessionEnd"
] as const;

export interface ClaudeHookSettings {
  hooks: Record<string, Array<{ hooks: Array<{ type: "http"; url: string; timeout: number }> }>>;
}

/** Creates side-effect-only localhost hooks that never return a Claude control decision. */
export function createClaudeHookSettings(
  url = "http://127.0.0.1:4317/hooks/claude"
): ClaudeHookSettings {
  const hooks: ClaudeHookSettings["hooks"] = Object.fromEntries(
    observedEvents.map((event) => [
      event,
      [{ hooks: [{ type: "http" as const, url, timeout: 1 }] }]
    ])
  );
  return { hooks };
}
