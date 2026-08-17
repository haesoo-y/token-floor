import type { ReactNode } from "react";

/** Shared floating surface for office tools and activity details. */
export function FloatingPanel({
  placement,
  className = "",
  minimized = false,
  minimizedLabel,
  restoreLabel,
  onRestore,
  children
}: {
  placement: "left" | "right";
  className?: string;
  minimized?: boolean;
  minimizedLabel?: string;
  restoreLabel?: string;
  onRestore?: () => void;
  children: ReactNode;
}) {
  const classes = [
    "floating-panel",
    `floating-panel--${placement}`,
    minimized ? "is-minimized" : "",
    className
  ]
    .filter(Boolean)
    .join(" ");
  if (minimized) {
    return (
      <aside className={classes}>
        <strong>{minimizedLabel}</strong>
        <button
          type="button"
          className="panel-toggle"
          aria-label={restoreLabel}
          title={restoreLabel}
          onClick={onRestore}
        >
          ↗
        </button>
      </aside>
    );
  }
  return <aside className={classes}>{children}</aside>;
}
