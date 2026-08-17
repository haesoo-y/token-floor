import os from "node:os";
import path from "node:path";

export interface RuntimePaths {
  root: string;
  config: string;
  database: string;
  memos: string;
  usage: string;
}

export function resolveRuntimePaths(cwd = process.cwd()): RuntimePaths {
  const root = path.resolve(cwd, ".token-floor");
  return {
    root,
    config: path.join(root, "config.json"),
    database: path.join(root, "events.db"),
    memos: path.join(root, "memos.json"),
    usage: path.join(root, "provider-usage.json")
  };
}

export function resolveProviderPaths(home = os.homedir()) {
  const claudeRoot = path.join(home, ".claude");
  const claudeDesktopRoot = path.join(
    home,
    process.platform === "darwin" ? "Library/Application Support/Claude" : ".config/Claude"
  );
  return {
    claudeRoot,
    claudeSettings: path.join(claudeRoot, "settings.json"),
    claudeProjects: path.join(claudeRoot, "projects"),
    claudeUsage: path.join(claudeDesktopRoot, "plan-usage-history.json"),
    claudeDesktopCache: path.join(claudeDesktopRoot, "Cache/Cache_Data"),
    codexRoot: path.join(home, ".codex"),
    codexSessions: path.join(home, ".codex", "sessions")
  };
}
