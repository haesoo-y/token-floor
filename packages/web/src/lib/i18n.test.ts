import { describe, expect, it } from "vitest";
import { translate } from "./i18n.js";

describe("translate", () => {
  it("ships the same owned status labels in all locales", () => {
    expect(translate("en", "waiting")).toBe("Waiting");
    expect(translate("ko", "waiting")).toBe("대기 중");
    expect(translate("ja", "waiting")).toBe("待機中");
  });
});
