import type { OfficeOverlayActor } from "../game/officeOverlay.js";

export function OfficeOverlays({ actors }: { actors: readonly OfficeOverlayActor[] }) {
  return (
    <div className="office-overlays" aria-live="polite">
      {actors.map((actor) => (
        <div
          className={`actor-overlay ${actor.provider} status-${actor.status}`}
          key={actor.id}
          style={{ left: actor.x, top: actor.y }}
        >
          {actor.bubble ? <div className="actor-bubble">{actor.bubble}</div> : null}
          <div className="actor-label">{actor.label}</div>
        </div>
      ))}
    </div>
  );
}
