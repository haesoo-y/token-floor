/** Selects a random item while omitting one value when another choice exists. */
export function randomChoiceExcept<T>(
  items: readonly T[],
  excluded: T | undefined,
  random: () => number = Math.random
): T {
  if (items.length === 0) throw new Error("Cannot choose from an empty collection");
  const excludedIndex = excluded === undefined ? -1 : items.indexOf(excluded);
  const candidateCount = excludedIndex < 0 ? items.length : items.length - 1;
  if (candidateCount === 0) return items[0]!;
  const draw = Math.min(Math.floor(random() * candidateCount), candidateCount - 1);
  const index = excludedIndex >= 0 && draw >= excludedIndex ? draw + 1 : draw;
  return items[index]!;
}
