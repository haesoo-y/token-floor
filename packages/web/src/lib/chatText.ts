/** Truncates normalized chat text at a display boundary using an explicit three-dot suffix. */
export function truncateChatText(text: string, maxLength: number): string {
  const characters = Array.from(text);
  if (characters.length <= maxLength) return text;
  return `${characters
    .slice(0, Math.max(0, maxLength - 3))
    .join("")
    .trimEnd()}...`;
}
