# Token Floor

Watch Claude Code, Codex, and other coding agents work as animated coworkers in a real-time pixel office.

## Local development

```sh
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. On startup, Token Floor automatically installs localhost lifecycle
observers in `~/.claude/settings.json`. The persisted settings are reused on later launches.
Token Floor creates
`~/.claude/settings.json.token-floor.backup` before the first change and removes only its own
entries when disconnected.

The integration stores normalized lifecycle metadata in `.token-floor/events.db`. It does not
store prompts, assistant responses, tool inputs, commands, or tool results. Enable the Phase 01
sample agents explicitly with `TOKEN_FLOOR_SIMULATION=true npm run dev`.

Claude usage is collected from both provider-owned roots. Token Floor reads Claude Desktop's
local HTTP cache and `plan-usage-history.json`, and inspects `~/.claude` for Claude Code CLI
rate-limit snapshots and session data. When no user-owned Claude status line exists, a silent local
observer captures the rate-limit metadata Claude Code already supplies; raw status input is not
persisted. The newest valid snapshot wins, while detailed reset data is preferred when Desktop
writes detailed and summary entries in the same refresh. Lifecycle recovery also reads
`~/.claude/projects`. Token Floor has no OAuth, login, API-key, or credential-storage flow. Set
`TOKEN_FLOOR_AUTO_OBSERVE_CLAUDE=false` only when automatic lifecycle observer installation is
unwanted.

The Codex collector reads provider-owned token-count records under `~/.codex/sessions`; Token
Floor does not launch or authenticate Codex.

Provider collectors refresh on a bounded interval and atomically write normalized snapshots to
the Git-ignored `.token-floor/provider-usage.json`. The server projects usage from this cache and
keeps its last valid values when provider files are temporarily unavailable or incomplete.
