import { createClaudeHookSettings, createClaudeStatusLineSetting } from "./hook-config.js";

type SettingsRecord = Record<string, unknown>;

function isRecord(value: unknown): value is SettingsRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ownedEndpoint(value: unknown, pathname: string): boolean {
  return (
    typeof value === "string" &&
    new RegExp(`^http://127\\.0\\.0\\.1:[0-9]+${pathname.replace("-", "\\-")}$`).test(value)
  );
}

function tokenFloorUrl(value: unknown, pathname: string): boolean {
  if (!isRecord(value) || !Array.isArray(value.hooks)) return false;
  return value.hooks.some(
    (hook) =>
      isRecord(hook) &&
      ((hook.type === "http" && ownedEndpoint(hook.url, pathname)) ||
        (hook.type === "command" &&
          Array.isArray(hook.args) &&
          hook.args.some((argument) => ownedEndpoint(argument, pathname))))
  );
}

function tokenFloorStatusLine(value: unknown): boolean {
  return (
    isRecord(value) &&
    value.type === "command" &&
    typeof value.command === "string" &&
    /http:\/\/127\.0\.0\.1:[0-9]+\/hooks\/claude-usage/.test(value.command)
  );
}

/** Adds Token Floor observers without replacing hooks owned by the user or other tools. */
export function mergeClaudeHookSettings(
  settings: SettingsRecord,
  url?: string,
  usageUrl?: string
): SettingsRecord {
  const generated = createClaudeHookSettings(url).hooks;
  const currentHooks = isRecord(settings.hooks) ? settings.hooks : {};
  const hooks: SettingsRecord = { ...currentHooks };
  for (const [event, observers] of Object.entries(generated)) {
    const existing = Array.isArray(currentHooks[event]) ? currentHooks[event] : [];
    const unrelated = existing.filter((entry) => !tokenFloorUrl(entry, "/hooks/claude"));
    hooks[event] = [...unrelated, ...observers];
  }
  const statusLine =
    settings.statusLine === undefined || tokenFloorStatusLine(settings.statusLine)
      ? createClaudeStatusLineSetting(usageUrl)
      : settings.statusLine;
  return { ...settings, hooks, statusLine };
}

/** Removes only Token Floor observers and leaves all unrelated Claude settings intact. */
export function removeClaudeHookSettings(settings: SettingsRecord): SettingsRecord {
  const base = { ...settings };
  if (tokenFloorStatusLine(base.statusLine)) delete base.statusLine;
  if (!isRecord(settings.hooks)) return base;
  const hooks = Object.fromEntries(
    Object.entries(settings.hooks).flatMap(([event, value]) => {
      if (!Array.isArray(value)) return [[event, value]];
      const retained = value.filter((entry) => !tokenFloorUrl(entry, "/hooks/claude"));
      return retained.length > 0 ? [[event, retained]] : [];
    })
  );
  return { ...base, hooks };
}
