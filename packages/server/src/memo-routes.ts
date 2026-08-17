import type { IncomingMessage, ServerResponse } from "node:http";
import { sendJson } from "./json-response.js";
import { MemoNotArchivedError, MemoNotFoundError } from "./memo-store.js";
import type { JsonMemoStore } from "./memo-store.js";
import { readJsonBody } from "./request-body.js";

/** Handles local-only memo routes and reports whether the request was claimed. */
export function handleMemoRequest(
  request: IncomingMessage,
  response: ServerResponse,
  store: JsonMemoStore
): boolean {
  if (request.method === "GET" && request.url === "/memos") {
    sendJson(response, 200, store.load());
    return true;
  }
  if (request.method === "POST" && request.url === "/memos") {
    void mutate(request, response, (payload) => store.create(readText(payload)));
    return true;
  }
  const match = request.url?.match(/^\/memos\/([^/]+)$/);
  if (request.method === "PATCH" && match) {
    void mutate(request, response, (payload) =>
      store.update(decodeURIComponent(match[1]!), readPatch(payload))
    );
    return true;
  }
  if (request.method === "DELETE" && match) {
    try {
      sendJson(response, 200, store.delete(decodeURIComponent(match[1]!)));
    } catch (error) {
      const status = error instanceof MemoNotArchivedError ? 409 : 404;
      sendJson(response, status, {
        error: status === 409 ? "Archive memo before deletion" : "Memo not found"
      });
    }
    return true;
  }
  return false;
}

async function mutate(
  request: IncomingMessage,
  response: ServerResponse,
  operation: (payload: unknown) => unknown
): Promise<void> {
  try {
    sendJson(response, 200, operation(await readJsonBody(request)));
  } catch (error) {
    const status = error instanceof MemoNotFoundError ? 404 : 400;
    sendJson(response, status, { error: status === 404 ? "Memo not found" : "Invalid memo" });
  }
}

function readText(payload: unknown): string {
  if (
    !payload ||
    typeof payload !== "object" ||
    typeof (payload as { text?: unknown }).text !== "string"
  ) {
    throw new TypeError("Invalid memo text");
  }
  return (payload as { text: string }).text;
}

function readPatch(payload: unknown): { text?: string; archived?: boolean } {
  if (!payload || typeof payload !== "object") throw new TypeError("Invalid memo patch");
  const value = payload as { text?: unknown; archived?: unknown };
  if (value.text !== undefined && typeof value.text !== "string") throw new TypeError();
  if (value.archived !== undefined && typeof value.archived !== "boolean") throw new TypeError();
  if (value.text === undefined && value.archived === undefined) throw new TypeError();
  return { text: value.text, archived: value.archived } as { text?: string; archived?: boolean };
}
