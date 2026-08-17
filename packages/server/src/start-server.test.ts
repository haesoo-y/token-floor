import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import WebSocket from "ws";
import { startTokenFloor } from "./start-server.js";

describe("production server", () => {
  it("serves UI, HTTP, and WebSocket on one port without creating provider roots", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-floor-start-"));
    const cwd = path.join(root, "project");
    const home = path.join(root, "home");
    const webRootPath = path.join(root, "web");
    fs.mkdirSync(webRootPath, { recursive: true });
    fs.mkdirSync(cwd);
    fs.writeFileSync(path.join(webRootPath, "index.html"), "<!doctype html><title>Office</title>");
    const port = await availablePort();
    const app = await startTokenFloor({ port, cwd, home, webRootPath });
    try {
      expect((await fetch(`${app.url}/health`)).status).toBe(200);
      expect(await (await fetch(app.url)).text()).toContain("Office");
      const snapshot = await websocketSnapshot(app.url, port);
      expect(snapshot).toContain('"type":"snapshot"');
      expect(fs.existsSync(path.join(home, ".claude"))).toBe(false);
      expect(fs.existsSync(path.join(home, ".codex"))).toBe(false);
    } finally {
      await app.close();
    }
  });
});

async function availablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") return reject(new Error("No port"));
      server.close(() => resolve(address.port));
    });
  });
}

async function websocketSnapshot(url: string, port: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url.replace("http://", "ws://") + "/events", {
      origin: `http://127.0.0.1:${port}`
    });
    socket.once("message", (message) => {
      socket.close();
      resolve(String(message));
    });
    socket.once("error", reject);
  });
}
