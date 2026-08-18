[English](README.md) | [한국어](docs/README.ko.md) | [日本語](docs/README.ja.md)

# Token Floor

**Your Claude Code and Codex agents, alive in one local pixel office — with no extra login.**

Token Floor turns the local activity already produced by Claude Code and Codex into a live, top-down office. Open it and see which agents are working, waiting, done, or in error; read sanitized conversations and events; check remaining usage; walk around the office; and keep project memos on the meeting-room whiteboard.

There is no Token Floor account, provider OAuth screen, API-key form, or second Claude/Codex sign-in. If a provider is already configured on your machine, Token Floor observes its local state on `127.0.0.1` and starts lightly. Provider credentials and raw tool payloads stay out of Token Floor.

![Claude Code and Codex agents working in the Token Floor office](docs/assets/agents-working.png)

_Active main agents and subagents have distinct sprites and work positions; completed agents take a break in the lounge._

## Why Token Floor

- **No additional login:** no Token Floor account, no copied API key, no OAuth consent flow, and no repeated provider login.
- **Local-first and read-only:** provider-owned files are read locally, the server binds to loopback, and normalized runtime data stays in the Git-ignored `.token-floor/` directory.
- **Two providers, one vocabulary:** Claude- and Codex-specific records become the same small lifecycle contract before reaching the server or UI.
- **A glanceable office, not another terminal:** status, movement, bubbles, usage, logs, and memos share one compact scene.
- **Safe by construction:** reasoning, raw provider records, tool inputs/results, credentials, guardian activity, and internal orchestration messages are excluded.

## Features

### Live multi-provider office

- Watches Claude Code and Codex at the same time, while allowing either provider to be absent or temporarily unhealthy.
- Shows active, waiting, completed, and error totals in the header.
- Represents main agents, subagents, and provider usage NPCs with distinct precomposed pixel sprites.
- Assigns stable labels, role-specific work destinations, staggered cardinal routes, varied speed and pause timing, and collision-aware movement.
- Moves completed agents into the coffee lounge, where they rotate short localized idle phrases without covering the office with simultaneous bubbles.
- Keeps work-area speech visible while an agent is present, prioritizing sanitized assistant messages over state transitions and idle lines.
- Retains completed characters for 60 minutes, while hiding already-expired characters immediately after a restart.

### Interactive office

- Lets you walk with **WASD or the arrow keys**, using the same four-direction movement and facing logic.
- Keeps arrow keys assigned to the player when panels, tabs, buttons, or the whiteboard receive focus. While an input, textarea, or editable element owns text entry, both arrows and WASD remain with the editor.
- Uses a compact five-zone layout: agent workspace, meeting room, coffee lounge, separate Codex and Claude usage offices, and a future area.
- Provides solid walls, meeting table, and whiteboard collision, agent route avoidance, depth sorting, camera follow, wheel zoom, and crisp nearest-neighbor pixel rendering.
- More office furniture will arrive with the next version. Thank you for waiting.
- Offers multiple player avatars, stored locally, through the character picker and settings.
- Checks required runtime art before entering the office and shows a direct local asset-path diagnostic instead of a broken scene.

### Agent details, chat, and event history

- Opens an agent detail panel by selecting a character and shows provider, status, project, session, activity, wait/error context, and parent agent.
- Keeps **sanitized chat** separate from **non-chat lifecycle events**, with independent tabs and up to 100 recent entries in each log.
- Stores normalized logs in SQLite and restores them after a server restart, independently of the 60-minute character lifetime.
- Handles duplicate records idempotently and prevents older events from rolling back newer state.
- Keeps the last valid office snapshot visible while the WebSocket reconnects.

### Reliable activity and completion

- Converts Codex task, message, subagent, function, MCP, custom-tool, and reasoning boundaries into provider-neutral lifecycle events.
- Treats `mcp_tool_call_begin`, `mcp_tool_call_end`, and `agent_reasoning` as payload-free active heartbeats, preventing a genuinely busy Codex agent from being marked complete after five minutes.
- Infers completion only after five minutes without newer activity, and never times out waiting or failed agents as completed.
- Skips valid but unsupported records quietly and reports actual malformed-source conditions separately.

### Usage meters without provider login

- Reads provider-supplied local rate-limit metadata without calling provider APIs or launching helper agents.
- Shows separate five-hour and weekly remaining percentages, reset details, last synchronization time, and unavailable states.
- Opens the same usage details from the header cards or the provider NPCs in their separate offices.
- Collects Claude usage from supported CLI/Desktop local sources and selects the newest, most complete valid sample.
- Collects Codex usage from recent local rollout records.
- Keeps last-known-good usage during missing, locked, partial, or malformed source updates and writes only normalized usage to an atomic local cache.

### Whiteboard memos

- Opens and closes the memo panel by clicking the meeting-room whiteboard.
- Creates memos up to 1,000 characters with `Ctrl`/`Cmd` + `Enter`, and supports refresh, expand/collapse, and copy.
- Lets active memos be edited or archived.
- Lets archived memos be restored or permanently deleted; deletion is intentionally unavailable for active memos.
- Saves versioned memo JSON atomically to `.token-floor/memos.json`, outside Git.

### Language, settings, and degraded operation

- Ships the interface in English, Korean, and Japanese.
- Persists locale and avatar preferences in browser local storage with safe fallbacks.
- Reports the app connection and each provider's `healthy`, `waiting`, `missing`, `stale`, `malformed`, or `disconnected` condition independently.
- Shows provider capabilities and actionable local-source diagnostics without requesting credentials or provider paths in the UI.

### Privacy boundary

Token Floor stores only allowlisted normalized fields needed for the office. It deliberately excludes:

- raw Claude or Codex records;
- reasoning and chain-of-thought content;
- tool arguments, inputs, outputs, invocation payloads, and commands;
- API keys, bearer tokens, environment secrets, authentication data, and local usernames;
- Claude sidechains, Codex guardian agents, and internal orchestration prompts;
- tool-use/tool-result blocks as chat messages.

Redaction is applied before persistence and applied again when legacy SQLite rows are loaded.

![Token Floor with memo, agent chat, event, usage, and character panels open](docs/assets/all-panels-open.png)

_The whiteboard memo panel and activity panel reuse translucent dark-navy floating-panel primitives without backdrop blur._

## Run Token Floor

### Requirements

- Node.js 22 or newer, including `node:sqlite`
- npm 10 or newer
- macOS

### Package CLI

The default command and `start` are equivalent:

```bash
npx token-floor
npx token-floor start
npx token-floor --port 8080
TOKEN_FLOOR_PORT=8080 npx token-floor
```

The production UI, HTTP API, and WebSocket share one loopback URL. Port precedence is `--port` > `TOKEN_FLOOR_PORT` > installed `.token-floor/config.json` > `10214`.

Normal startup automatically prepares Token Floor's Claude observers for the resolved port after the loopback server is listening. A separate `install` command is not required. Existing Claude hooks and user-owned status lines are preserved, and no Claude directory is created when Claude Code is absent.

Lifecycle commands never log in to or start a provider:

```bash
npx token-floor install --port 8080
npx token-floor diagnose --port 8080
npx token-floor uninstall
npx token-floor uninstall --delete-local-data
```

`install` remains available to preconfigure or repair only Token Floor-owned Claude observers without starting the server. `diagnose` is read-only. `uninstall` preserves events, usage cache, and memos unless `--delete-local-data` is explicit. Claude-only, Codex-only, and provider-free machines are supported.

### Development

```bash
git clone https://github.com/haesoo-y/token-floor.git
cd token-floor
npm install
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). The local collector/server listens on `127.0.0.1:10214`.

Use `TOKEN_FLOOR_PORT` for the development server and `npm run dev -w @token-floor/web -- --port 5174` for a different Vite UI port. Set `TOKEN_FLOOR_BROWSER_ORIGIN` to that UI origin when changing the Vite port.

No separate Claude or Codex login is performed by Token Floor. Use the providers normally once on your machine; Token Floor observes the local state they already own.

To run the deterministic demo instead of local collectors:

```bash
TOKEN_FLOOR_SIMULATION=true npm run dev
```

### Useful commands

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

## Local data

Runtime files are written under `.token-floor/` and ignored by Git:

| File                               | Purpose                                                                       |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| `.token-floor/events.db`           | Allowlisted normalized lifecycle, chat, and usage events for restart recovery |
| `.token-floor/provider-usage.json` | Atomic normalized usage cache and last-known-good fallback                    |
| `.token-floor/memos.json`          | Versioned whiteboard memo store                                               |
| `.token-floor/config.json`         | Token Floor-owned installed port configuration                                |

The web UI never reads Claude or Codex files directly. See [Architecture](ARCHITECTURE.md) for the complete data flow and security boundary.

## Project packages

| Package                   | Responsibility                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------ |
| `packages/protocol`       | Provider-neutral events, validation, redaction, reducer, retention, memo contracts   |
| `packages/adapter-claude` | Claude hooks, transcript recovery, local usage decoding and normalization            |
| `packages/adapter-codex`  | Codex JSONL session/usage decoding and normalization                                 |
| `packages/server`         | Loopback HTTP/WebSocket server, collectors, SQLite and JSON persistence, maintenance |
| `packages/web`            | React interface, Phaser office, panels, settings, localization, reconnect behavior   |
| `packages/asset-contract` | Runtime asset manifest and validation contracts                                      |
| `packages/cli`            | CLI parsing, install/diagnose/uninstall ownership, and production startup            |

## Art credits

Character and office art used by Token Floor is sourced from the [MetroCity Free Top-Down Character Pack by JIK-A-4](https://jik-a-4.itch.io/metrocity-free-topdown-character-pack), offered under [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/). Token Floor's runtime character sheets are composed for provider roles while preserving the pack's authored pixel-art direction. See [NOTICE](NOTICE) for redistribution details.

## License

Token Floor source code is available under the [MIT License](LICENSE). Third-party artwork remains identified separately in [NOTICE](NOTICE).
