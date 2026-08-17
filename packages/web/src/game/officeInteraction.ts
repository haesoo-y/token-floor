/** Maps retained office props to provider-neutral UI tools. */
export function interactionForOfficeProp(propId: string): "memos" | undefined {
  return propId === "whiteboard" ? "memos" : undefined;
}

/** Toggles the memo panel when the same whiteboard interaction is repeated. */
export function nextMemoPanelOpenState(current: boolean): boolean {
  return !current;
}
