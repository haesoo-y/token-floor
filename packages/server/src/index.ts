import path from "node:path";
import os from "node:os";
import { installClaudeObservers } from "@token-floor/adapter-claude";
import { createTokenFloorServer } from "./app-server.js";
import { SqliteEventStore } from "./event-store.js";

const host = "127.0.0.1";
const port = Number(process.env.TOKEN_FLOOR_PORT ?? 4317);
const databasePath = process.env.TOKEN_FLOOR_DB ?? path.resolve(".token-floor/events.db");
const providerUsageCachePath =
  process.env.TOKEN_FLOOR_PROVIDER_USAGE_CACHE ??
  path.resolve(import.meta.dirname, "../../..", ".token-floor/provider-usage.json");
const claudeSettingsPath =
  process.env.TOKEN_FLOOR_CLAUDE_SETTINGS ?? path.join(os.homedir(), ".claude", "settings.json");
const claudeProjectsPath =
  process.env.TOKEN_FLOOR_CLAUDE_PROJECTS ?? path.join(os.homedir(), ".claude", "projects");
const claudeCliRootPath = process.env.TOKEN_FLOOR_CLAUDE_ROOT ?? path.join(os.homedir(), ".claude");
const codexSessionsPath =
  process.env.TOKEN_FLOOR_CODEX_SESSIONS ?? path.join(os.homedir(), ".codex", "sessions");
const claudeUsagePath =
  process.env.TOKEN_FLOOR_CLAUDE_USAGE ??
  path.join(
    os.homedir(),
    process.platform === "darwin" ? "Library/Application Support/Claude" : ".config/Claude",
    "plan-usage-history.json"
  );
const claudeDesktopCachePath =
  process.env.TOKEN_FLOOR_CLAUDE_DESKTOP_CACHE ??
  path.join(
    os.homedir(),
    process.platform === "darwin" ? "Library/Application Support/Claude" : ".config/Claude",
    "Cache/Cache_Data"
  );
if (process.env.TOKEN_FLOOR_AUTO_OBSERVE_CLAUDE !== "false") {
  try {
    installClaudeObservers(claudeSettingsPath);
  } catch {
    console.warn("Token Floor could not install Claude local observers automatically.");
  }
}
const app = createTokenFloorServer({
  claudeCliRootPath,
  claudeDesktopCachePath,
  claudeProjectsPath,
  claudeUsagePath,
  codexSessionsPath,
  providerUsageCachePath,
  eventStore: new SqliteEventStore(databasePath),
  simulation: process.env.TOKEN_FLOOR_SIMULATION === "true"
});

app.server.listen(port, host, () => {
  console.log(`Token Floor server: http://${host}:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => void app.close().then(() => process.exit(0)));
}
