import { useEffect, useRef } from "react";
import type { AgentSnapshot } from "@token-floor/protocol";
import { createOfficeGame } from "../game/createOfficeGame.js";
import type { AvatarPreset } from "../lib/avatar.js";

export function OfficeCanvas({
  agents,
  preset,
  onSelect
}: {
  agents: Record<string, AgentSnapshot>;
  preset: AvatarPreset;
  onSelect: (id: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const runtime = useRef<ReturnType<typeof createOfficeGame> | undefined>(undefined);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  // Phaser is an imperative runtime, so React owns one instance for this host's mounted lifetime.
  useEffect(() => {
    if (!host.current) return;
    runtime.current = createOfficeGame(host.current, (id) => selectRef.current(id));
    return () => {
      runtime.current?.game.destroy(true);
      runtime.current = undefined;
    };
  }, []);

  // Push immutable React projections into the existing scene without recreating the Phaser game.
  useEffect(() => runtime.current?.scene.syncAgents(agents), [agents]);
  // Avatar customization updates the live sprite while preserving player position and camera state.
  useEffect(() => runtime.current?.scene.setPlayerPreset(preset), [preset]);
  return <div className="office-canvas" ref={host} />;
}
