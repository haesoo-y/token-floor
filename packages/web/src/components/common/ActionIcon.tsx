export type ActionIconName = "archive" | "copy" | "delete" | "edit" | "restore";

/** Crisp stroke icons shared by compact action buttons. */
export function ActionIcon({ name }: { name: ActionIconName }) {
  const paths = {
    copy: (
      <>
        <rect x="8" y="8" width="11" height="11" rx="2" />
        <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
      </>
    ),
    edit: (
      <>
        <path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z" />
        <path d="m13.5 6.5 4 4" />
      </>
    ),
    archive: (
      <>
        <path d="M4 8h16v11H4z" />
        <path d="M3 4h18v4H3zM9 12h6" />
      </>
    ),
    restore: (
      <>
        <path d="M4 12a8 8 0 1 0 3-6.2" />
        <path d="M4 4v6h6" />
      </>
    ),
    delete: (
      <>
        <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13" />
        <path d="M10 11v5M14 11v5" />
      </>
    )
  } as const;
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {paths[name]}
      </g>
    </svg>
  );
}
