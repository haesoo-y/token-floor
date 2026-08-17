import { describe, expect, it } from "vitest";
import { reconnectDelay } from "./connectionRetry.js";

describe("reconnectDelay", () => {
  it("backs off reconnects while keeping recovery bounded", () => {
    expect([0, 1, 2, 3, 4, 8].map(reconnectDelay)).toEqual([1000, 2000, 4000, 8000, 10000, 10000]);
  });
});
