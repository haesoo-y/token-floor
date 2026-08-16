import type { AvatarPreset } from "../lib/avatar.js";
import { translate, type Locale } from "../lib/i18n.js";

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
        {(["rose", "cyan", "violet"] as const).map((value) => (
          <button
            key={value}
            className={`preset preset-${value} ${preset === value ? "selected" : ""}`}
            onClick={() => onChange(value)}
            aria-label={`${value} avatar`}
          />
        ))}
      </div>
    </div>
  );
}
