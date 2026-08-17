import { describe, expect, it } from "vitest";
import { createHealthPayload } from "./health.js";

describe("createHealthPayload", () => {
  it("returns a stable local service contract", () => {
    expect(createHealthPayload(12.9)).toEqual({
      status: "ok",
      service: "token-floor",
      version: "0.1.0",
      uptimeSeconds: 12
    });
  });
});
