import { describe, expect, it } from "vitest";
import { usageDetailValues } from "./usageDetails.js";

describe("usageDetailValues", () => {
  it("exposes both limits and formats dates before relative time", () => {
    const values = usageDetailValues(
      {
        capability: "weekly-percentage",
        remainingPercent: 68,
        fiveHourRemainingPercent: 91,
        resetsAt: "2026-08-18T00:00:00.000Z",
        checkedAt: "2026-08-16T00:00:00.000Z"
      },
      "en",
      "Unavailable",
      new Date("2026-08-17T00:00:00.000Z")
    );
    expect(values.weekly).toBe("68%");
    expect(values.fiveHour).toBe("91%");
    expect(values.lastSyncedAt).toMatch(/\(.+ago\)$/);
    expect(values.resetsAt).toMatch(/\(in .+\)$/);
  });

  it("uses the localized unavailable label for missing values", () => {
    const values = usageDetailValues(
      { capability: "unavailable", checkedAt: "", unavailableReason: "No adapter" },
      "ko",
      "확인 불가"
    );
    expect(values).toEqual({
      weekly: "확인 불가",
      fiveHour: "확인 불가",
      lastSyncedAt: "확인 불가",
      resetsAt: "확인 불가"
    });
  });

  it("uses the supplied fallback independently for a missing limit window", () => {
    const values = usageDetailValues(
      { capability: "weekly-percentage", remainingPercent: 74, checkedAt: "" },
      "ko",
      "-"
    );
    expect(values.fiveHour).toBe("-");
    expect(values.weekly).toBe("74%");
  });
});
