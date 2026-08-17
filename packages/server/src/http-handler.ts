import type { IncomingMessage, ServerResponse } from "node:http";
import type { ClaudeSubagentRegistry } from "@token-floor/adapter-claude";
import type { NormalizedEvent, OfficeState } from "@token-floor/protocol";
import { ingestClaudeHook } from "./claude-ingestion.js";
import { ingestClaudeUsage } from "./claude-usage-ingestion.js";
import { createHealthPayload } from "./health.js";
import { sendCorsPreflight, sendJson } from "./json-response.js";
import { handleMemoRequest } from "./memo-routes.js";
import type { JsonMemoStore } from "./memo-store.js";
import { readJsonBody } from "./request-body.js";
import {
  hasJsonContentType,
  hasLoopbackHost,
  isMemoMutation,
  isTrustedHookRequest,
  trustedBrowserOrigin
} from "./request-security.js";

interface HttpHandlerOptions {
  browserOrigin: string;
  startedAt: number;
  getState: () => OfficeState;
  memoStore: JsonMemoStore;
  claudeRegistry: ClaudeSubagentRegistry;
  acceptEvent: (event: NormalizedEvent) => void;
  providerUsageCachePath?: string;
}

/** Owns the loopback HTTP trust boundary and routes only admitted requests. */
export function createHttpHandler(options: HttpHandlerOptions) {
  return (request: IncomingMessage, response: ServerResponse): void => {
    if (!hasLoopbackHost(request)) return sendJson(response, 403, { error: "Forbidden host" });
    const corsOrigin = trustedBrowserOrigin(request, options.browserOrigin);
    if (request.method === "OPTIONS") {
      return corsOrigin
        ? sendCorsPreflight(response, corsOrigin)
        : sendJson(response, 403, { error: "Forbidden origin" });
    }
    if (isMemoMutation(request) && !corsOrigin) {
      return sendJson(response, 403, { error: "Forbidden origin" });
    }
    if (
      isMemoMutation(request) &&
      (request.method === "POST" || request.method === "PATCH") &&
      !hasJsonContentType(request)
    ) {
      return sendJson(response, 415, { error: "JSON content type required" }, corsOrigin);
    }
    if (request.method === "GET" && request.url === "/health") {
      return sendJson(
        response,
        200,
        createHealthPayload((Date.now() - options.startedAt) / 1000),
        corsOrigin
      );
    }
    if (request.method === "GET" && request.url === "/snapshot") {
      return sendJson(response, 200, options.getState(), corsOrigin);
    }
    if (handleMemoRequest(request, response, options.memoStore, corsOrigin)) return;
    if (request.method === "POST" && request.url === "/hooks/claude") {
      if (!isTrustedHookRequest(request)) {
        return sendJson(response, 403, { error: "Forbidden hook request" });
      }
      void readJsonBody(request)
        .then((payload) => {
          const result = ingestClaudeHook(
            options.getState(),
            payload,
            new Date(),
            options.claudeRegistry
          );
          if (result.event) options.acceptEvent(result.event);
          response.writeHead(204).end();
        })
        .catch(() => sendJson(response, 400, { error: "Invalid Claude hook payload" }));
      return;
    }
    if (request.method === "POST" && request.url === "/hooks/claude-usage") {
      if (!isTrustedHookRequest(request)) {
        return sendJson(response, 403, { error: "Forbidden hook request" });
      }
      void readJsonBody(request)
        .then((payload) => {
          ingestClaudeUsage(
            payload,
            options.providerUsageCachePath,
            options.acceptEvent,
            new Date()
          );
          response.writeHead(204).end();
        })
        .catch(() => sendJson(response, 400, { error: "Invalid Claude usage payload" }));
      return;
    }
    sendJson(response, 404, { error: "Not found" }, corsOrigin);
  };
}
