export type AvatarPreset = "rose" | "cyan" | "violet";

export interface AvatarFrames {
  texture: "suit" | "suit1";
  bodyFrame: number;
  hairFrame: number;
}

export function framesForProvider(provider: string, id: string): AvatarFrames {
  const variant = hash(id) % 5;
  if (provider === "codex") return { texture: "suit1", bodyFrame: 48, hairFrame: variant * 24 };
  if (provider === "claude-code")
    return { texture: "suit", bodyFrame: 72, hairFrame: variant * 24 };
  return { texture: "suit1", bodyFrame: (hash(provider) % 5) * 24, hairFrame: variant * 24 };
}

export function framesForPlayer(preset: AvatarPreset): AvatarFrames {
  const rows: Record<AvatarPreset, number> = { rose: 24, cyan: 72, violet: 96 };
  return { texture: "suit1", bodyFrame: rows[preset], hairFrame: rows[preset] };
}

function hash(value: string): number {
  let result = 2166136261;
  for (const char of value) result = Math.imul(result ^ char.charCodeAt(0), 16777619);
  return result >>> 0;
}
