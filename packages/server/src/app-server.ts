import http, { type IncomingMessage, type ServerResponse } from "node:http";
import { applyEvent, createOfficeState, type OfficeState } from "@token-floor/protocol";
import { WebSocketServer } from "ws";
import { createHealthPayload } from "./health.js";
import { createInitialEvents, createScenarioEvent } from "./simulation.js";

export interface TokenFloorServer {
  server: http.Server;
  close: () => Promise<void>;
}

function json(res: ServerResponse, status: number, value: unknown): void {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "http://127.0.0.1:5173",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(value));
}

/**
 * Creates the local HTTP and WebSocket projection server.
 *
 * The simulation source will be replaced by provider adapters without changing either transport
 * or the normalized state consumed by the web client.
 */
export function createTokenFloorServer(): TokenFloorServer {
  const startedAt = Date.now();
  let state: OfficeState = createInitialEvents().reduce(applyEvent, createOfficeState());
  let step = 0;
  const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
    if (req.method === "GET" && req.url === "/health") {
      return json(res, 200, createHealthPayload((Date.now() - startedAt) / 1000));
    }
    if (req.method === "GET" && req.url === "/snapshot") return json(res, 200, state);
    json(res, 404, { error: "Not found" });
  });
  const sockets = new WebSocketServer({ noServer: true });
  sockets.on("connection", (socket) => socket.send(JSON.stringify({ type: "snapshot", state })));
  server.on("upgrade", (request, socket, head) => {
    if (request.url !== "/events") return socket.destroy();
    sockets.handleUpgrade(request, socket, head, (client) =>
      sockets.emit("connection", client, request)
    );
  });
  const timer = setInterval(() => {
    const event = createScenarioEvent(step++);
    state = applyEvent(state, event);
    const message = JSON.stringify({ type: "event", event });
    for (const socket of sockets.clients)
      if (socket.readyState === socket.OPEN) socket.send(message);
  }, 3_500);
  return {
    server,
    close: () =>
      new Promise((resolve, reject) => {
        clearInterval(timer);
        sockets.close();
        server.close((error) => (error ? reject(error) : resolve()));
      })
  };
}
