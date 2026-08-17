import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { createTokenFloorServer } from "./app-server.js";
import type { TokenFloorServer } from "./server-types.js";

const apps: TokenFloorServer[] = [];
const directories: string[] = [];
const browserOrigin = "http://127.0.0.1:5173";

afterEach(async () => {
  for (const app of apps.splice(0)) await app.close();
  for (const directory of directories.splice(0)) fs.rmSync(directory, { recursive: true });
});

async function startServer(): Promise<number> {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "token-floor-security-"));
  directories.push(directory);
  const app = createTokenFloorServer({
    browserOrigin,
    memosPath: path.join(directory, "memos.json"),
    simulation: false
  });
  try {
    await new Promise<void>((resolve, reject) => {
      app.server.once("error", reject);
      app.server.listen(0, "127.0.0.1", () => {
        app.server.off("error", reject);
        resolve();
      });
    });
  } catch (error) {
    await app.close();
    throw error;
  }
  apps.push(app);
  const address = app.server.address();
  if (!address || typeof address === "string") throw new Error("Missing test address");
  return address.port;
}

async function request(
  port: number,
  method: string,
  pathname: string,
  headers: http.OutgoingHttpHeaders = {},
  body?: string
): Promise<{ status: number; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const call = http.request(
      { host: "127.0.0.1", port, method, path: pathname, headers },
      (response) => {
        response.resume();
        response.on("end", () =>
          resolve({ status: response.statusCode ?? 0, headers: response.headers })
        );
      }
    );
    call.on("error", reject);
    if (body !== undefined) call.end(body);
    else call.end();
  });
}

describe("Token Floor loopback trust boundary", () => {
  it("rejects DNS-rebinding hosts and untrusted browser origins", async () => {
    const port = await startServer();
    expect((await request(port, "GET", "/health", { Host: "attacker.example" })).status).toBe(403);
    const rejected = await request(
      port,
      "POST",
      "/memos",
      { Origin: "https://attacker.example", "Content-Type": "text/plain" },
      JSON.stringify({ text: "forged" })
    );
    expect(rejected.status).toBe(403);
    expect(rejected.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("requires trusted JSON browser mutations and observer-only hook posts", async () => {
    const port = await startServer();
    expect(
      (
        await request(
          port,
          "POST",
          "/memos",
          { Origin: browserOrigin, "Content-Type": "text/plain" },
          JSON.stringify({ text: "memo" })
        )
      ).status
    ).toBe(415);
    expect(
      (
        await request(
          port,
          "POST",
          "/memos",
          { Origin: browserOrigin, "Content-Type": "application/json" },
          JSON.stringify({ text: "memo" })
        )
      ).status
    ).toBe(200);
    expect(
      (
        await request(
          port,
          "POST",
          "/hooks/claude",
          { "Content-Type": "application/json" },
          JSON.stringify({})
        )
      ).status
    ).toBe(403);
    expect(
      (
        await request(
          port,
          "POST",
          "/hooks/claude",
          {
            "Content-Type": "application/json",
            "X-Token-Floor-Hook": "token-floor-observer-v1"
          },
          JSON.stringify({})
        )
      ).status
    ).toBe(400);
  });

  it("admits WebSockets only from the configured Token Floor origin", async () => {
    const port = await startServer();
    const rejected = new WebSocket(`ws://127.0.0.1:${port}/events`, {
      origin: "https://attacker.example"
    });
    await new Promise<void>((resolve) => {
      rejected.once("error", () => resolve());
      rejected.once("close", () => resolve());
    });

    const trusted = new WebSocket(`ws://127.0.0.1:${port}/events`, { origin: browserOrigin });
    const message = await new Promise<string>((resolve, reject) => {
      trusted.once("message", (data) => resolve(String(data)));
      trusted.once("error", reject);
    });
    expect(JSON.parse(message)).toMatchObject({ type: "snapshot" });
    trusted.close();
    await new Promise<void>((resolve) => trusted.once("close", () => resolve()));
  });
});
