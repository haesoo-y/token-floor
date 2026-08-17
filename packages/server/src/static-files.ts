import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";

const CONTENT_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};

/** Serves only regular files contained by the immutable production web root. */
export function serveStaticFile(
  request: IncomingMessage,
  response: ServerResponse,
  webRoot: string | undefined
): boolean {
  if (!webRoot || (request.method !== "GET" && request.method !== "HEAD")) return false;
  let pathname: string;
  try {
    pathname = decodeURIComponent(new URL(request.url ?? "/", "http://127.0.0.1").pathname);
  } catch {
    response.writeHead(400).end("Bad request");
    return true;
  }
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const root = path.resolve(webRoot);
  const filename = path.resolve(root, relative);
  if (filename !== root && !filename.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403).end("Forbidden");
    return true;
  }
  try {
    const stat = fs.lstatSync(filename);
    if (!stat.isFile() || stat.isSymbolicLink()) return false;
    response.writeHead(200, {
      "Content-Type": CONTENT_TYPES[path.extname(filename)] ?? "application/octet-stream",
      "Content-Length": stat.size,
      "Cache-Control":
        relative === "index.html" ? "no-cache" : "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff"
    });
    if (request.method === "HEAD") return (void response.end(), true);
    fs.createReadStream(filename).pipe(response);
    return true;
  } catch {
    return false;
  }
}
