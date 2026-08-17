import type { AvatarPreset } from "../lib/avatar.js";
import { framesForPlayer, playerPresets } from "../lib/avatar.js";
import { translate, type Locale } from "../lib/i18n.js";
import { AvatarPreview } from "./common/AvatarPreview.js";

export function CharacterPicker({
  preset,
  onChange,
  locale
}: {
  preset: AvatarPreset;
  onChange: (preset: AvatarPreset) => void;
  locale: Locale;
}) {
  return (
    <div className="character-picker">
      <span>{translate(locale, "player")}</span>
      <div>
        {playerPresets.map((value) => (
          <button
            key={value}
            className={`preset ${preset === value ? "selected" : ""}`}
            onClick={() => onChange(value)}
            aria-label={`${value} avatar`}
            title={value}
          >
            <AvatarPreview frames={framesForPlayer(value)} />
          </button>
        ))}
      </div>
    </div>
  );
}
