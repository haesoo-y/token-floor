import { describe, expect, it } from "vitest";
import { usageDetailValues } from "./usageDetails.js";

describe("usageDetailValues", () => {
  it("exposes a weekly percentage and provider timestamps", () => {
    const values = usageDetailValues(
      {
        capability: "weekly-percentage",
        remainingPercent: 68,
        checkedAt: "2026-08-16T00:00:00.000Z"
      },
      "en",
      "Unavailable"
    );
    expect(values.weekly).toBe("68%");
    expect(values.checkedAt).not.toBe("—");
  });

  it("preserves the unavailable reason", () => {
    const values = usageDetailValues(
      { capability: "unavailable", checkedAt: "", unavailableReason: "No adapter" },
      "ko",
      "확인 불가"
    );
    expect(values).toMatchObject({ weekly: "확인 불가", reason: "No adapter" });
  });
});
