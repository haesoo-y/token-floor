import { createClaudeHookSettings } from "./hook-config.js";

type SettingsRecord = Record<string, unknown>;

function isRecord(value: unknown): value is SettingsRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function tokenFloorUrl(value: unknown, url: string): boolean {
  if (!isRecord(value) || !Array.isArray(value.hooks)) return false;
  return value.hooks.some((hook) => isRecord(hook) && hook.type === "http" && hook.url === url);
}

/** Adds Token Floor observers without replacing hooks owned by the user or other tools. */
export function mergeClaudeHookSettings(
  settings: SettingsRecord,
  url = "http://127.0.0.1:4317/hooks/claude"
): SettingsRecord {
  const generated = createClaudeHookSettings(url).hooks;
  const currentHooks = isRecord(settings.hooks) ? settings.hooks : {};
  const hooks: SettingsRecord = { ...currentHooks };
  for (const [event, observers] of Object.entries(generated)) {
    const existing = Array.isArray(currentHooks[event]) ? currentHooks[event] : [];
    hooks[event] = existing.some((entry) => tokenFloorUrl(entry, url))
      ? existing
      : [...existing, ...observers];
  }
  return { ...settings, hooks };
}

/** Removes only Token Floor observers and leaves all unrelated Claude settings intact. */
export function removeClaudeHookSettings(
  settings: SettingsRecord,
  url = "http://127.0.0.1:4317/hooks/claude"
): SettingsRecord {
  if (!isRecord(settings.hooks)) return { ...settings };
  const hooks = Object.fromEntries(
    Object.entries(settings.hooks).flatMap(([event, value]) => {
      if (!Array.isArray(value)) return [[event, value]];
      const retained = value.filter((entry) => !tokenFloorUrl(entry, url));
      return retained.length > 0 ? [[event, retained]] : [];
    })
  );
  return { ...settings, hooks };
}
