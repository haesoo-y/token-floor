export const playerPresets = ["onyx", "raven", "noir"] as const;
export type AvatarPreset = (typeof playerPresets)[number];

export interface AvatarFrames {
  texture: string;
}

/** Chooses one of the authored MetroCity composites while keeping an identity stable. */
export function framesForProvider(
  provider: string,
  id: string,
  subagent = false,
  npc = false,
  variant?: number
): AvatarFrames {
  const family = provider === "claude-code" ? "claude" : "codex";
  if (npc) return { texture: `mc-${family}-npc` };
  const role = subagent ? "sub" : "main";
  const variantIndex = variant === undefined ? hash(id) % 2 : Math.abs(variant) % 2;
  return { texture: `mc-${family}-${role}-${variantIndex}` };
}

export function framesForPlayer(preset: AvatarPreset): AvatarFrames {
  return { texture: `mc-player-${preset}` };
}

export function resolveAvatarPreset(value: string | null): AvatarPreset {
  return playerPresets.includes(value as AvatarPreset) ? (value as AvatarPreset) : "onyx";
}

/** Reuses the executive usage NPC identity in the compact weekly usage cards. */
export function framesForUsage(provider: string): AvatarFrames {
  return framesForProvider(provider, `usage-${provider}`, false, true);
}

function hash(value: string): number {
  let result = 2166136261;
  for (const character of value) result = Math.imul(result ^ character.charCodeAt(0), 16777619);
  return result >>> 0;
}
