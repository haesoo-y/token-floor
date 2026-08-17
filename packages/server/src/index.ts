import { resolveTokenFloorPort } from "@token-floor/protocol";
import { startTokenFloor } from "./start-server.js";

const port = resolveTokenFloorPort(
  process.env.TOKEN_FLOOR_PORT === undefined ? {} : { environment: process.env.TOKEN_FLOOR_PORT }
);
const app = await startTokenFloor({
  port,
  browserOrigin: process.env.TOKEN_FLOOR_BROWSER_ORIGIN ?? "http://127.0.0.1:5173",
  simulation: process.env.TOKEN_FLOOR_SIMULATION === "true"
});

console.log(`Token Floor development server: ${app.url}`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => void app.close().then(() => (process.exitCode = 0)));
}
