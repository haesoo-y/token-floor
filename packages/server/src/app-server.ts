import http, { type IncomingMessage, type ServerResponse } from "node:http";
import { ClaudeSubagentRegistry } from "@token-floor/adapter-claude";
import {
  applyEvent,
  createOfficeState,
  pruneCompletedAgents,
  type NormalizedEvent,
  type OfficeState
} from "@token-floor/protocol";
import { WebSocketServer } from "ws";
import { startAgentMaintenance } from "./agent-maintenance.js";
import { ingestClaudeHook } from "./claude-ingestion.js";
import { startClaudeMaintenance } from "./claude-maintenance.js";
import { removeUnobservedClaudeAgents } from "./claude-state-migration.js";
import { ingestClaudeUsage } from "./claude-usage-ingestion.js";
import { startCodexMaintenance } from "./codex-maintenance.js";
import { removeHiddenCodexAgents, removeLegacyCodexAgents } from "./codex-state-migration.js";
import { createHealthPayload } from "./health.js";
import { sendJson } from "./json-response.js";
import { startProviderUsageMaintenance } from "./provider-usage-maintenance.js";
import { applyProviderSourceReport } from "./provider-source-projection.js";
import { readJsonBody } from "./request-body.js";
import { createInitialEvents, createScenarioEvent } from "./simulation.js";
import type { ProviderCollectorReport } from "./source-diagnostics.js";
import type { TokenFloorServer, TokenFloorServerOptions } from "./server-types.js";
import { terminateWebSocketClients } from "./websocket-shutdown.js";

export type { TokenFloorServer, TokenFloorServerOptions } from "./server-types.js";

/** Creates the local HTTP and WebSocket projection server. */
export function createTokenFloorServer(options: TokenFloorServerOptions = {}): TokenFloorServer {
  const startedAt = Date.now();
  const restored = options.eventStore?.load() ?? [];
  const seed =
    restored.length > 0 ? restored : options.simulation === false ? [] : createInitialEvents();
  let state: OfficeState = seed.reduce(applyEvent, createOfficeState());
  state = pruneCompletedAgents(state, new Date());
  state = removeUnobservedClaudeAgents(state, restored);
  if (restored.length > 0) state = removeLegacyCodexAgents(state);
  const claudeRegistry = ClaudeSubagentRegistry.fromEvents(restored);
  let step = 0;
  const sockets = new WebSocketServer({ noServer: true });
  const broadcast = (event: Parameters<typeof applyEvent>[1]) => {
    const message = JSON.stringify({ type: "event", event });
    for (const socket of sockets.clients) {
      if (socket.readyState === socket.OPEN) socket.send(message);
    }
  };
  const acceptEvent = (event: NormalizedEvent) => {
    const next = applyEvent(state, event);
    if (next === state) return;
    state = next;
    options.eventStore?.append(event);
    broadcast(event);
  };
  const acceptRecoveredEvent = acceptEvent;
  const broadcastSnapshot = (snapshot: OfficeState) => {
    const message = JSON.stringify({ type: "snapshot", state: snapshot });
    for (const socket of sockets.clients) {
      if (socket.readyState === socket.OPEN) socket.send(message);
    }
  };
  const acceptSourceReport = (
    provider: "codex" | "claude-code",
    report: ProviderCollectorReport
  ) => {
    const next = applyProviderSourceReport(state, provider, report);
    if (next === state) return;
    state = next;
    broadcastSnapshot(state);
  };
  const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
    if (req.method === "OPTIONS") return res.writeHead(204).end();
    if (req.method === "GET" && req.url === "/health") {
      return sendJson(res, 200, createHealthPayload((Date.now() - startedAt) / 1000));
    }
    if (req.method === "GET" && req.url === "/snapshot") return sendJson(res, 200, state);
    if (req.method === "POST" && req.url === "/hooks/claude") {
      void readJsonBody(req)
        .then((payload) => {
          const result = ingestClaudeHook(state, payload, new Date(), claudeRegistry);
          const event = result.event;
          if (event) acceptEvent(event);
          res.writeHead(204).end();
        })
        .catch(() => sendJson(res, 400, { error: "Invalid Claude hook payload" }));
      return;
    }
    if (req.method === "POST" && req.url === "/hooks/claude-usage") {
      void readJsonBody(req)
        .then((payload) => {
          ingestClaudeUsage(
            payload,
            options.providerUsageCachePath,
            acceptRecoveredEvent,
            new Date()
          );
          res.writeHead(204).end();
        })
        .catch(() => sendJson(res, 400, { error: "Invalid Claude usage payload" }));
      return;
    }
    sendJson(res, 404, { error: "Not found" });
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
  const stopClaudeMaintenance = startClaudeMaintenance({
    getState: () => state,
    projectsPath: options.claudeProjectsPath,
    acceptRecoveredEvent,
    reportStatus: (report) => acceptSourceReport("claude-code", report)
  });
  const stopAgentMaintenance = startAgentMaintenance({
    getState: () => state,
    setState: (next) => {
      state = next;
    },
    broadcastSnapshot,
    onChange: (previous, next) => {
      for (const [id, agent] of Object.entries(next.agents)) {
        const before = previous.agents[id];
        if (
          before?.status === "active" &&
          agent.status === "completed" &&
          agent.provider === "claude-code" &&
          agent.kind === "subagent" &&
          agent.executionId
        ) {
          claudeRegistry.release(agent.sessionId, agent.executionId);
        }
      }
    }
  });
  const stopCodexMaintenance = startCodexMaintenance({
    sessionsPath: options.codexSessionsPath,
    acceptEvent: acceptRecoveredEvent,
    excludeAgents: (ids) => {
      const next = removeHiddenCodexAgents(state, ids);
      if (next === state) return;
      state = next;
      broadcastSnapshot(state);
    },
    reportStatus: (report) => acceptSourceReport("codex", report)
  });
  const stopProviderUsageMaintenance = startProviderUsageMaintenance({
    cachePath: options.providerUsageCachePath,
    claudeCliRootPath: options.claudeCliRootPath,
    claudeDesktopCachePath: options.claudeDesktopCachePath,
    claudeUsagePath: options.claudeUsagePath,
    codexSessionsPath: options.codexSessionsPath,
    acceptEvent: acceptRecoveredEvent
  });
  return {
    server,
    close: () =>
      new Promise((resolve, reject) => {
        if (timer) clearInterval(timer);
        stopClaudeMaintenance();
        stopAgentMaintenance();
        stopCodexMaintenance();
        stopProviderUsageMaintenance();
        terminateWebSocketClients(sockets.clients);
        sockets.close();
        server.close((error) => {
          options.eventStore?.close();
          return error ? reject(error) : resolve();
        });
      })
  };
}
