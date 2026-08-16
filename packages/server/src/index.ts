import { createTokenFloorServer } from "./app-server.js";

const host = "127.0.0.1";
const port = Number(process.env.TOKEN_FLOOR_PORT ?? 4317);
const app = createTokenFloorServer();

app.server.listen(port, host, () => {
  console.log(`Token Floor server: http://${host}:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => void app.close().then(() => process.exit(0)));
}
