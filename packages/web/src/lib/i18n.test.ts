import { describe, expect, it } from "vitest";
import { resolveLocale, translate } from "./i18n.js";

describe("translate", () => {
  it("falls back from malformed persisted locale values", () => {
    expect(resolveLocale("broken")).toBe("en");
    expect(resolveLocale(null)).toBe("en");
    expect(resolveLocale("ko")).toBe("ko");
  });

  it("ships the same owned status labels in all locales", () => {
    expect(translate("en", "waiting")).toBe("Waiting");
    expect(translate("ko", "waiting")).toBe("대기 중");
    expect(translate("ja", "waiting")).toBe("待機中");
  });
});
