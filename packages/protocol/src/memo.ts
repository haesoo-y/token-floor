/** A user-authored local note shown on the office whiteboard. */
export interface Memo {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

/** Versioned JSON document persisted under Token Floor's ignored runtime directory. */
export interface MemoDocument {
  version: 1;
  memos: Memo[];
}

/** Returns a deterministic copy ordered by most recent user-visible mutation. */
export function sortMemosByUpdatedAt(memos: readonly Memo[]): Memo[] {
  return [...memos].sort(
    (left, right) =>
      right.updatedAt.localeCompare(left.updatedAt) || left.id.localeCompare(right.id)
  );
}
