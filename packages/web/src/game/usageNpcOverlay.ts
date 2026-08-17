/** Keeps usage NPC overlays informational and intentionally free of speech bubbles. */
export function usageNpcOverlay(provider: "codex" | "claude-code") {
  return {
    id: `usage-${provider}`,
    label: provider === "codex" ? "CODEX METER" : "CLAUDE METER",
    provider,
    status: "npc" as const
  };
}
