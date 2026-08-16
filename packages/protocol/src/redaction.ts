const secretPatterns: Array<[RegExp, string]> = [
  [/\bsk-[A-Za-z0-9_-]{8,}\b/g, "[REDACTED_KEY]"],
  [/(\bBearer\s+)[A-Za-z0-9._~+/-]+=*/gi, "$1[REDACTED_TOKEN]"],
  [/\b([A-Z][A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|API_KEY))=([^\s]+)/g, "$1=[REDACTED]"],
  [/(\/Users\/|\/home\/)[^/\s]+/g, "$1[USER]"],
  [/[A-Z]:\\Users\\[^\\\s]+/gi, "C:\\Users\\[USER]"]
];

export interface SpeechSanitizerOptions {
  maxLength?: number;
}

/**
 * Redacts common credentials and local user paths before activity text reaches speech bubbles.
 * This is a display safety boundary, not a substitute for provider-side secret handling.
 */
export function sanitizeSpeech(input: string, options: SpeechSanitizerOptions = {}): string {
  const maxLength = options.maxLength ?? 96;
  let output = input.replace(/\s+/g, " ").trim();
  for (const [pattern, replacement] of secretPatterns)
    output = output.replace(pattern, replacement);
  if (output.length <= maxLength) return output;
  return `${output.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}
