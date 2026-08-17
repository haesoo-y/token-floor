import type { OfficeOverlayActor } from "../game/officeOverlay.js";
import { translate, type Locale } from "../lib/i18n.js";

export function OfficeOverlays({
  actors,
  locale,
  onOpenMemos
}: {
  actors: readonly OfficeOverlayActor[];
  locale: Locale;
  onOpenMemos: () => void;
}) {
  return (
    <div className="office-overlays" aria-live="polite">
      {actors.map((actor) =>
        actor.tool === "memos" ? (
          <button
            type="button"
            className="office-tool-overlay"
            key={actor.id}
            style={{ left: actor.x, top: actor.y, width: actor.width, height: actor.height }}
            aria-label={translate(locale, "whiteboard")}
            onClick={onOpenMemos}
          />
        ) : (
          <div
            className={`actor-overlay ${actor.provider} status-${actor.status}`}
            key={actor.id}
            style={{ left: actor.x, top: actor.y }}
          >
            {actor.bubble ? <div className="actor-bubble">{actor.bubble}</div> : null}
            <div className="actor-label">{actor.label}</div>
          </div>
        )
      )}
    </div>
  );
}
