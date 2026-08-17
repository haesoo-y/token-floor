import type { ServerResponse } from "node:http";

export function sendJson(
  res: ServerResponse,
  status: number,
  value: unknown,
  corsOrigin?: string
): void {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
    ...(corsOrigin ? { "Access-Control-Allow-Origin": corsOrigin, Vary: "Origin" } : {})
  });
  res.end(JSON.stringify(value));
}

export function sendCorsPreflight(res: ServerResponse, corsOrigin: string): void {
  res.writeHead(204, {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "600",
    Vary: "Origin"
  });
  res.end();
}
