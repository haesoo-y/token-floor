import { useEffect, useRef, useState } from "react";
import type { AgentSnapshot } from "@token-floor/protocol";
import { createOfficeGame } from "../game/createOfficeGame.js";
import type { AvatarPreset } from "../lib/avatar.js";
import type { OfficeOverlayActor } from "../game/officeOverlay.js";
import { OfficeOverlays } from "./OfficeOverlays.js";
import type { Locale } from "../lib/i18n.js";

export function OfficeCanvas({
  agents,
  preset,
  locale,
  onSelect,
  onSelectUsage
}: {
  agents: Record<string, AgentSnapshot>;
  preset: AvatarPreset;
  locale: Locale;
  onSelect: (id: string) => void;
  onSelectUsage: (provider: "codex" | "claude-code") => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const runtime = useRef<ReturnType<typeof createOfficeGame> | undefined>(undefined);
  const [overlays, setOverlays] = useState<readonly OfficeOverlayActor[]>([]);
  const selectRef = useRef(onSelect);
  const selectUsageRef = useRef(onSelectUsage);
  selectRef.current = onSelect;
  selectUsageRef.current = onSelectUsage;

  // Phaser is an imperative runtime, so React owns one instance for this host's mounted lifetime.
  useEffect(() => {
    if (!host.current) return;
    runtime.current = createOfficeGame(
      host.current,
      (id) => selectRef.current(id),
      (provider) => selectUsageRef.current(provider),
      setOverlays
    );
    return () => {
      runtime.current?.game.destroy(true);
      runtime.current = undefined;
    };
  }, []);

  // Push immutable React projections into the existing scene without recreating the Phaser game.
  useEffect(() => runtime.current?.scene.syncAgents(agents), [agents]);
  // Avatar customization updates the live sprite while preserving player position and camera state.
  useEffect(() => runtime.current?.scene.setPlayerPreset(preset), [preset]);
  // Locale changes update owned game speech without rebuilding the long-lived Phaser scene.
  useEffect(() => runtime.current?.scene.setLocale(locale), [locale]);
  return (
    <div className="office-canvas">
      <div className="office-game" ref={host} />
      <OfficeOverlays actors={overlays} />
    </div>
  );
}
