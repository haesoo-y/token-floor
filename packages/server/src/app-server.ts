import http, { type IncomingMessage, type ServerResponse } from "node:http";
import {
  getClaudeIntegrationStatus,
  installClaudeIntegration,
  uninstallClaudeIntegration
} from "@token-floor/adapter-claude";
import { applyEvent, createOfficeState, type OfficeState } from "@token-floor/protocol";
import { WebSocketServer } from "ws";
import { ingestClaudeHook } from "./claude-ingestion.js";
import type { EventStore } from "./event-store.js";
import { createHealthPayload } from "./health.js";
import { readJsonBody } from "./request-body.js";
import { createInitialEvents, createScenarioEvent } from "./simulation.js";

export interface TokenFloorServer {
  server: http.Server;
  close: () => Promise<void>;
}

export interface TokenFloorServerOptions {
  claudeSettingsPath?: string;
  eventStore?: EventStore;
  simulation?: boolean;
}

function json(res: ServerResponse, status: number, value: unknown): void {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "http://127.0.0.1:5173",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
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
export function createTokenFloorServer(options: TokenFloorServerOptions = {}): TokenFloorServer {
  const startedAt = Date.now();
  const restored = options.eventStore?.load() ?? [];
  const seed =
    restored.length > 0 ? restored : options.simulation === false ? [] : createInitialEvents();
  let state: OfficeState = seed.reduce(applyEvent, createOfficeState());
  let step = 0;
  const sockets = new WebSocketServer({ noServer: true });
  const broadcast = (event: Parameters<typeof applyEvent>[1]) => {
    const message = JSON.stringify({ type: "event", event });
    for (const socket of sockets.clients) {
      if (socket.readyState === socket.OPEN) socket.send(message);
    }
  };
  const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
    if (req.method === "OPTIONS") return res.writeHead(204).end();
    if (req.method === "GET" && req.url === "/health") {
      return json(res, 200, createHealthPayload((Date.now() - startedAt) / 1000));
    }
    if (req.method === "GET" && req.url === "/snapshot") return json(res, 200, state);
    if (req.url === "/integrations/claude" && options.claudeSettingsPath) {
      try {
        if (req.method === "GET") {
          return json(res, 200, getClaudeIntegrationStatus(options.claudeSettingsPath));
        }
        if (req.method === "POST") {
          return json(res, 200, installClaudeIntegration(options.claudeSettingsPath));
        }
        if (req.method === "DELETE") {
          return json(res, 200, uninstallClaudeIntegration(options.claudeSettingsPath));
        }
      } catch {
        return json(res, 500, { error: "Unable to update Claude settings" });
      }
    }
    if (req.method === "POST" && req.url === "/hooks/claude") {
      void readJsonBody(req)
        .then((payload) => {
          const result = ingestClaudeHook(state, payload);
          const event = result.event;
          if (event) {
            state = result.state;
            options.eventStore?.append(event);
            broadcast(event);
          }
          res.writeHead(204).end();
        })
        .catch(() => json(res, 400, { error: "Invalid Claude hook payload" }));
      return;
    }
    json(res, 404, { error: "Not found" });
  });
  sockets.on("connection", (socket) => socket.send(JSON.stringify({ type: "snapshot", state })));
  server.on("upgrade", (request, socket, head) => {
    if (request.url !== "/events") return socket.destroy();
    sockets.handleUpgrade(request, socket, head, (client) =>
      sockets.emit("connection", client, request)
    );
  });
  const timer =
    options.simulation === false
      ? undefined
      : setInterval(() => {
          const event = createScenarioEvent(step++);
          state = applyEvent(state, event);
          broadcast(event);
        }, 3_500);
  return {
    server,
    close: () =>
      new Promise((resolve, reject) => {
        if (timer) clearInterval(timer);
        sockets.close();
        server.close((error) => {
          options.eventStore?.close();
          return error ? reject(error) : resolve();
        });
      })
  };
}
