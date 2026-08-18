import { DEFAULT_TOKEN_FLOOR_PORT, loopbackUrl } from "@token-floor/protocol";

const defaultHookRoot = loopbackUrl(DEFAULT_TOKEN_FLOOR_PORT);

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
  hooks: Record<
    string,
    Array<{
      hooks: Array<{ type: "command"; command: string; args: string[]; timeout: number }>;
    }>
  >;
}

export interface ClaudeStatusLineSetting {
  type: "command";
  command: string;
}

/** Creates side-effect-only localhost hooks that never return a Claude control decision. */
export function createClaudeHookSettings(
  url = `${defaultHookRoot}/hooks/claude`
): ClaudeHookSettings {
  const hooks: ClaudeHookSettings["hooks"] = Object.fromEntries(
    observedEvents.map((event) => [
      event,
      [
        {
          hooks: [
            {
              type: "command" as const,
              command: "sh",
              args: [
                "-c",
                'curl --silent --max-time 1 --header "Content-Type: application/json" --header "X-Token-Floor-Hook: token-floor-observer-v1" --data-binary @- "$1" >/dev/null 2>&1 || true',
                "token-floor-observer",
                url
              ],
              timeout: 1
            }
          ]
        }
      ]
    ])
  );
  return { hooks };
}

/** Creates a silent observer for rate-limit metadata already supplied by Claude Code. */
export function createClaudeStatusLineSetting(
  url = `${defaultHookRoot}/hooks/claude-usage`
): ClaudeStatusLineSetting {
  return {
    type: "command",
    command: `curl --silent --max-time 1 --header "Content-Type: application/json" --header "X-Token-Floor-Hook: token-floor-observer-v1" --data-binary @- "${url}" >/dev/null 2>&1 || true`
  };
}
