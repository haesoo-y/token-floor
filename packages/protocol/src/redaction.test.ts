import { describe, expect, it } from "vitest";
import { sanitizeSpeech } from "./redaction.js";

describe("sanitizeSpeech", () => {
  it("redacts common credentials and user directories", () => {
    const input = "Bearer abc.def API_TOKEN=secret /Users/example/project sk-1234567890";
    expect(sanitizeSpeech(input)).toBe(
      "Bearer [REDACTED_TOKEN] API_TOKEN=[REDACTED] /Users/example/project [REDACTED_KEY]"
    );
  });

  it("collapses whitespace and enforces the bubble length", () => {
    expect(sanitizeSpeech("one\n  two three", { maxLength: 9 })).toBe("one two…");
  });
});
