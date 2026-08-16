# Token Floor

Watch Claude Code, Codex, and other coding agents work as animated coworkers in a real-time pixel office.

## Local development

```sh
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. Use **Connect Claude** to add the localhost lifecycle
observers to `~/.claude/settings.json`. Token Floor creates
`~/.claude/settings.json.token-floor.backup` before the first change and removes only its own
entries when disconnected.

The integration stores normalized lifecycle metadata in `.token-floor/events.db`. It does not
store prompts, assistant responses, tool inputs, commands, or tool results. Enable the Phase 01
sample agents explicitly with `TOKEN_FLOOR_SIMULATION=true npm run dev`.
