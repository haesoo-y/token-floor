import path from "node:path";
import os from "node:os";
import { createTokenFloorServer } from "./app-server.js";
import { SqliteEventStore } from "./event-store.js";

const host = "127.0.0.1";
const port = Number(process.env.TOKEN_FLOOR_PORT ?? 4317);
const databasePath = process.env.TOKEN_FLOOR_DB ?? path.resolve(".token-floor/events.db");
const claudeSettingsPath =
  process.env.TOKEN_FLOOR_CLAUDE_SETTINGS ?? path.join(os.homedir(), ".claude", "settings.json");
const app = createTokenFloorServer({
  claudeSettingsPath,
  eventStore: new SqliteEventStore(databasePath),
  simulation: process.env.TOKEN_FLOOR_SIMULATION === "true"
});

app.server.listen(port, host, () => {
  console.log(`Token Floor server: http://${host}:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => void app.close().then(() => process.exit(0)));
}
