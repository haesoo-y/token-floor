import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { UsageCards } from "./UsageCards.js";

describe("UsageCards", () => {
  it("shows five-hour then weekly remaining usage with independent fallbacks", () => {
    const markup = renderToStaticMarkup(
      <UsageCards
        usage={{
          codex: {
            capability: "weekly-percentage",
            remainingPercent: 68,
            fiveHourRemainingPercent: 91,
            checkedAt: "2026-08-17T00:00:00.000Z"
          },
          "claude-code": {
            capability: "weekly-percentage",
            remainingPercent: 74,
            checkedAt: "2026-08-17T00:00:00.000Z"
          }
        }}
        locale="ko"
        onSelect={() => undefined}
      />
    );

    expect(markup).toContain("Codex usage");
    expect(markup).toContain("91% | 68%");
    expect(markup).toContain("Claude usage");
    expect(markup).toContain("- - | 74%");
    expect(markup).not.toContain("weekly</small>");
  });
});
