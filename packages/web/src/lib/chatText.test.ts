import { describe, expect, it } from "vitest";
import { truncateChatText } from "./chatText.js";

describe("chat text", () => {
  it("keeps short messages and truncates long messages with three dots", () => {
    expect(truncateChatText("short reply", 50)).toBe("short reply");
    const result = truncateChatText("가".repeat(60), 50);
    expect(Array.from(result)).toHaveLength(50);
    expect(result.endsWith("...")).toBe(true);
  });
});
