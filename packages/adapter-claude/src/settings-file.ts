import fs from "node:fs";
import path from "node:path";
import { mergeClaudeHookSettings, removeClaudeHookSettings } from "./settings-merge.js";

export interface ClaudeObserverStatus {
  installed: boolean;
  settingsPath: string;
}

function readSettings(filename: string): Record<string, unknown> {
  if (!fs.existsSync(filename)) return {};
  return JSON.parse(fs.readFileSync(filename, "utf8")) as Record<string, unknown>;
}

function writeSettings(filename: string, settings: Record<string, unknown>): void {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.token-floor.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(settings, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temporary, filename);
}

/** Reports whether the provider-owned settings already contain Token Floor observers. */
export function getClaudeObserverStatus(filename: string): ClaudeObserverStatus {
  const settings = readSettings(filename);
  return {
    installed: JSON.stringify(removeClaudeHookSettings(settings)) !== JSON.stringify(settings),
    settingsPath: filename
  };
}

/** Installs idempotent local observers and creates one rollback backup. */
export function installClaudeObservers(
  filename: string,
  url?: string,
  usageUrl?: string
): ClaudeObserverStatus {
  const settings = readSettings(filename);
  const merged = mergeClaudeHookSettings(settings, url, usageUrl);
  if (JSON.stringify(merged) === JSON.stringify(settings)) return getClaudeObserverStatus(filename);
  if (fs.existsSync(filename) && !fs.existsSync(`${filename}.token-floor.backup`)) {
    fs.copyFileSync(filename, `${filename}.token-floor.backup`);
  }
  writeSettings(filename, merged);
  return getClaudeObserverStatus(filename);
}

/** Removes only Token Floor entries; other Claude settings and hooks remain untouched. */
export function uninstallClaudeObservers(filename: string): ClaudeObserverStatus {
  const settings = removeClaudeHookSettings(readSettings(filename));
  writeSettings(filename, settings);
  return getClaudeObserverStatus(filename);
}
