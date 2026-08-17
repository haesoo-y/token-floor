import type { IncomingMessage } from "node:http";

export const DEFAULT_BROWSER_ORIGIN = "http://127.0.0.1:5173";
export const TOKEN_FLOOR_HOOK_HEADER = "x-token-floor-hook";
export const TOKEN_FLOOR_HOOK_HEADER_VALUE = "token-floor-observer-v1";

/** Rejects DNS-rebinding hostnames even though the process itself binds only to loopback. */
export function hasLoopbackHost(request: IncomingMessage): boolean {
  const host = request.headers.host;
  if (!host) return false;
  try {
    return new URL(`http://${host}`).hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export function trustedBrowserOrigin(
  request: IncomingMessage,
  allowedOrigin: string
): string | undefined {
  return request.headers.origin === allowedOrigin ? allowedOrigin : undefined;
}

export function hasJsonContentType(request: IncomingMessage): boolean {
  const contentType = request.headers["content-type"];
  return typeof contentType === "string" && /^application\/json(?:\s*;|$)/i.test(contentType);
}

/** Hooks use a non-simple header so an arbitrary webpage cannot forge a browser POST. */
export function isTrustedHookRequest(request: IncomingMessage): boolean {
  return (
    request.headers.origin === undefined &&
    request.headers[TOKEN_FLOOR_HOOK_HEADER] === TOKEN_FLOOR_HOOK_HEADER_VALUE &&
    hasJsonContentType(request)
  );
}

export function isMemoMutation(request: IncomingMessage): boolean {
  return (
    request.url?.startsWith("/memos") === true &&
    (request.method === "POST" || request.method === "PATCH" || request.method === "DELETE")
  );
}
