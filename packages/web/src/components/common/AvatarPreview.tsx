import type { CSSProperties } from "react";
import type { AvatarFrames } from "../../lib/avatar.js";

/** Renders the same coherent front-facing frame used by the Phaser actor. */
export function AvatarPreview({ frames }: { frames: AvatarFrames }) {
  return <span className="avatar-preview" style={previewStyle(frames)} aria-hidden="true" />;
}

export function previewStyle(frames: AvatarFrames): CSSProperties {
  return {
    backgroundImage: `url("/assets/token-floor/characters/${frames.texture}.png")`,
    backgroundPosition: "0 0"
  };
}
