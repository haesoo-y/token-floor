export const VERSION = "0.2.0";

export const HELP = `Token Floor — local-first Claude Code and Codex observability

Usage:
  token-floor [start] [--port <1-65535>]
  token-floor install [--port <1-65535>]
  token-floor diagnose [--port <1-65535>]
  token-floor uninstall [--delete-local-data]
  token-floor --help
  token-floor --version

Port precedence: --port > TOKEN_FLOOR_PORT > .token-floor/config.json > 10214
The server always binds to 127.0.0.1.
Normal startup automatically prepares Claude observers when Claude Code is installed.`;
