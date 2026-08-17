import fs from "node:fs";
import net from "node:net";
import { execFileSync } from "node:child_process";
import { resolveProviderPaths, resolveRuntimePaths } from "@token-floor/server/runtime-paths";
import { claudeObserverInstalled } from "./lifecycle.js";
import { VERSION } from "./help.js";

export interface DiagnosticOptions {
  cwd: string;
  home: string;
  port: number;
  webRootPath: string;
}

export async function diagnoseTokenFloor(options: DiagnosticOptions): Promise<string[]> {
  const runtime = resolveRuntimePaths(options.cwd);
  const provider = resolveProviderPaths(options.home);
  const available = await portAvailable(options.port);
  return [
    `node: ${process.versions.node}`,
    `npm: ${npmVersion()}`,
    `token-floor: ${VERSION}`,
    `host: 127.0.0.1`,
    `port: ${options.port} (${available ? "available" : "in use"})`,
    `runtime: .token-floor (${fs.existsSync(runtime.root) ? "present" : "missing"})`,
    `sqlite: ${sqliteStatus(runtime.database)}`,
    `usage cache: ${jsonStatus(runtime.usage)}`,
    `memos: ${jsonStatus(runtime.memos)}`,
    `production assets: ${fs.existsSync(`${options.webRootPath}/index.html`) ? "ready" : "missing"}`,
    `claude-code: ${fs.existsSync(provider.claudeRoot) ? "installed" : "not installed"}`,
    `claude observer: ${claudeObserverInstalled(options.home) ? "installed" : "missing"}`,
    `codex: ${fs.existsSync(provider.codexRoot) ? "installed" : "not installed"}`
  ];
}

function npmVersion(): string {
  try {
    return execFileSync("npm", ["--version"], { encoding: "utf8", timeout: 2_000 }).trim();
  } catch {
    return "unavailable";
  }
}

function jsonStatus(filename: string): string {
  if (!fs.existsSync(filename)) return "missing";
  try {
    JSON.parse(fs.readFileSync(filename, "utf8"));
    return "valid";
  } catch {
    return "malformed";
  }
}

function sqliteStatus(filename: string): string {
  if (!fs.existsSync(filename)) return "missing";
  try {
    const header = Buffer.alloc(16);
    const file = fs.openSync(filename, "r");
    fs.readSync(file, header, 0, 16, 0);
    fs.closeSync(file);
    return header.toString("binary") === "SQLite format 3\0" ? "valid" : "malformed";
  } catch {
    return "error";
  }
}

async function portAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.listen(port, "127.0.0.1", () => server.close(() => resolve(true)));
  });
}
