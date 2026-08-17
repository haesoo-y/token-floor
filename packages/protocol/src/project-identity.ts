import type { ProjectIdentity } from "./model.js";
import { sanitizeSpeech } from "./redaction.js";

const HOME_ROOT = /^(?:\/Users\/[^/]+|\/home\/[^/]+|[A-Za-z]:\/Users\/[^/]+)\/?$/i;

/** Converts a provider path into a stable pseudonymous identity before it leaves its adapter. */
export function createOpaqueProjectIdentity(
  provider: string,
  sourceId: string,
  displayLabel?: string
): ProjectIdentity {
  const normalizedSource = sourceId.replaceAll("\\", "/");
  const fallbackLabel = normalizedSource.split("/").filter(Boolean).at(-1) ?? "Project";
  const label = HOME_ROOT.test(normalizedSource)
    ? "Project"
    : sanitizeSpeech(displayLabel || fallbackLabel, { maxLength: 96 }) || "Project";
  return {
    id: new RegExp(`^project:${escapePattern(provider)}:[0-9a-f]{16}$`).test(sourceId)
      ? sourceId
      : `project:${provider}:${fnv1a64(normalizedSource)}`,
    label
  };
}

function escapePattern(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fnv1a64(value: string): string {
  let hash = 0xcbf29ce484222325n;
  for (const character of value) {
    const codePoint = character.codePointAt(0)!;
    hash ^= BigInt(codePoint);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, "0");
}
