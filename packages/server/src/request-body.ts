import type { IncomingMessage } from "node:http";

const MAX_HOOK_BYTES = 256 * 1024;

/** Reads a bounded JSON request so malformed hooks cannot exhaust the local server. */
export async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_HOOK_BYTES) throw new Error("Hook payload too large");
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
