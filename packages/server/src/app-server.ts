import http from "node:http";
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
import { startClaudeMaintenance } from "./claude-maintenance.js";
import { removeUnobservedClaudeAgents } from "./claude-state-migration.js";
import { startCodexMaintenance } from "./codex-maintenance.js";
import { removeHiddenCodexAgents, removeLegacyCodexAgents } from "./codex-state-migration.js";
import { createHttpHandler } from "./http-handler.js";
import { JsonMemoStore } from "./memo-store.js";
import { startProviderUsageMaintenance } from "./provider-usage-maintenance.js";
import { applyProviderSourceReport } from "./provider-source-projection.js";
import {
  DEFAULT_BROWSER_ORIGIN,
  hasLoopbackHost,
  trustedBrowserOrigin
} from "./request-security.js";
import { createInitialEvents, createScenarioEvent } from "./simulation.js";
import type { ProviderCollectorReport } from "./source-diagnostics.js";
import type { TokenFloorServer, TokenFloorServerOptions } from "./server-types.js";
import { terminateWebSocketClients } from "./websocket-shutdown.js";

export type { TokenFloorServer, TokenFloorServerOptions } from "./server-types.js";

/** Creates the local HTTP and WebSocket projection server. */
export function createTokenFloorServer(options: TokenFloorServerOptions = {}): TokenFloorServer {
  const startedAt = Date.now();
  const browserOrigin = options.browserOrigin ?? DEFAULT_BROWSER_ORIGIN;
  const restored = options.eventStore?.load() ?? [];
  const seed =
    restored.length > 0 ? restored : options.simulation === false ? [] : createInitialEvents();
  let state: OfficeState = seed.reduce(applyEvent, createOfficeState());
  state = pruneCompletedAgents(state, new Date());
  state = removeUnobservedClaudeAgents(state, restored);
  if (restored.length > 0) state = removeLegacyCodexAgents(state);
  const claudeRegistry = ClaudeSubagentRegistry.fromEvents(restored);
  const memoStore = new JsonMemoStore(options.memosPath ?? ".token-floor/memos.json");
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
  const server = http.createServer(
    createHttpHandler({
      browserOrigin,
      startedAt,
      getState: () => state,
      memoStore,
      claudeRegistry,
      acceptEvent: acceptRecoveredEvent,
      ...(options.providerUsageCachePath
        ? { providerUsageCachePath: options.providerUsageCachePath }
        : {})
    })
  );
  sockets.on("connection", (socket) => socket.send(JSON.stringify({ type: "snapshot", state })));
  server.on("upgrade", (request, socket, head) => {
    if (
      request.url !== "/events" ||
      !hasLoopbackHost(request) ||
      !trustedBrowserOrigin(request, browserOrigin)
    ) {
      return socket.destroy();
    }
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
          return error && (error as NodeJS.ErrnoException).code !== "ERR_SERVER_NOT_RUNNING"
            ? reject(error)
            : resolve();
        });
      })
  };
}
