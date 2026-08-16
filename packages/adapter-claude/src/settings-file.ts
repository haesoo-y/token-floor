import fs from "node:fs";
import path from "node:path";
import { mergeClaudeHookSettings, removeClaudeHookSettings } from "./settings-merge.js";

export interface ClaudeIntegrationStatus {
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

/** Reports whether the user settings already contain a Token Floor observer. */
export function getClaudeIntegrationStatus(filename: string): ClaudeIntegrationStatus {
  const settings = readSettings(filename);
  return {
    installed: JSON.stringify(removeClaudeHookSettings(settings)) !== JSON.stringify(settings),
    settingsPath: filename
  };
}

/** Installs idempotent hooks after explicit onboarding consent and creates one rollback backup. */
export function installClaudeIntegration(filename: string): ClaudeIntegrationStatus {
  const settings = readSettings(filename);
  if (fs.existsSync(filename) && !fs.existsSync(`${filename}.token-floor.backup`)) {
    fs.copyFileSync(filename, `${filename}.token-floor.backup`);
  }
  writeSettings(filename, mergeClaudeHookSettings(settings));
  return getClaudeIntegrationStatus(filename);
}

/** Removes only Token Floor entries; other Claude settings and hooks remain untouched. */
export function uninstallClaudeIntegration(filename: string): ClaudeIntegrationStatus {
  writeSettings(filename, removeClaudeHookSettings(readSettings(filename)));
  return getClaudeIntegrationStatus(filename);
}
