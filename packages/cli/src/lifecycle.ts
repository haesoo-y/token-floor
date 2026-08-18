import fs from "node:fs";
import path from "node:path";
import {
  getClaudeObserverStatus,
  installClaudeObservers,
  uninstallClaudeObservers
} from "@token-floor/adapter-claude";
import { loopbackUrl } from "@token-floor/protocol";
import { resolveProviderPaths, resolveRuntimePaths } from "@token-floor/server/runtime-paths";
import { writeLocalConfig } from "./local-config.js";

export interface LifecycleOptions {
  cwd: string;
  home: string;
  port: number;
}

export type ClaudeObserverSetup = "ready" | "not-installed";

/** Ensures normal CLI startup can observe Claude without a separate install command. */
export function ensureClaudeObserver(
  options: Pick<LifecycleOptions, "home" | "port">
): ClaudeObserverSetup {
  const provider = resolveProviderPaths(options.home);
  if (!fs.existsSync(provider.claudeRoot)) return "not-installed";
  const root = loopbackUrl(options.port);
  installClaudeObservers(
    provider.claudeSettings,
    `${root}/hooks/claude`,
    `${root}/hooks/claude-usage`
  );
  return "ready";
}

export function installTokenFloor(options: LifecycleOptions): string[] {
  const runtime = resolveRuntimePaths(options.cwd);
  const provider = resolveProviderPaths(options.home);
  writeLocalConfig(runtime.config, { version: 1, port: options.port });
  const lines = [`config: installed`, `port: ${options.port}`];
  if (ensureClaudeObserver(options) === "not-installed") {
    lines.push("claude-code: not installed");
  } else {
    lines.push("claude-code observer: installed");
  }
  lines.push(`codex: ${fs.existsSync(provider.codexRoot) ? "detected" : "not installed"}`);
  return lines;
}

export function uninstallTokenFloor(
  options: Omit<LifecycleOptions, "port"> & { deleteLocalData: boolean }
): string[] {
  const runtime = resolveRuntimePaths(options.cwd);
  const provider = resolveProviderPaths(options.home);
  if (fs.existsSync(provider.claudeSettings)) uninstallClaudeObservers(provider.claudeSettings);
  if (options.deleteLocalData) {
    deleteValidatedRuntimeRoot(runtime.root, options.cwd);
    return ["observer: removed", "local data: deleted"];
  }
  if (fs.existsSync(runtime.root)) {
    validateRuntimeRoot(runtime.root, options.cwd);
    if (fs.existsSync(runtime.config)) fs.unlinkSync(runtime.config);
  }
  return ["observer: removed", "local data: preserved"];
}

export function claudeObserverInstalled(home: string): boolean {
  const provider = resolveProviderPaths(home);
  if (!fs.existsSync(provider.claudeSettings)) return false;
  return getClaudeObserverStatus(provider.claudeSettings).installed;
}

function deleteValidatedRuntimeRoot(runtimeRoot: string, cwd: string): void {
  validateRuntimeRoot(runtimeRoot, cwd);
  if (fs.existsSync(runtimeRoot)) fs.rmSync(runtimeRoot, { recursive: true });
}

function validateRuntimeRoot(runtimeRoot: string, cwd: string): void {
  const expected = path.resolve(cwd, ".token-floor");
  if (path.resolve(runtimeRoot) !== expected || path.basename(runtimeRoot) !== ".token-floor") {
    throw new Error("Refusing to delete an invalid runtime directory");
  }
  if (!fs.existsSync(runtimeRoot)) return;
  const stat = fs.lstatSync(runtimeRoot);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error("Refusing to delete a non-directory runtime target");
  }
}
