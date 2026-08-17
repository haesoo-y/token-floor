import { describe, expect, it } from "vitest";
import { DEFAULT_TOKEN_FLOOR_PORT, parseTokenFloorPort, resolveTokenFloorPort } from "./port.js";

describe("Token Floor port contract", () => {
  it("uses CLI, environment, config, then default precedence", () => {
    expect(resolveTokenFloorPort({ cli: "8080", environment: "7000", installed: 6000 })).toBe(8080);
    expect(resolveTokenFloorPort({ environment: "7000", installed: 6000 })).toBe(7000);
    expect(resolveTokenFloorPort({ installed: 6000 })).toBe(6000);
    expect(resolveTokenFloorPort({})).toBe(DEFAULT_TOKEN_FLOOR_PORT);
  });

  it.each(["", "port", "1.5", "-1", "0", "65536", " 8080"])("rejects %j", (value) => {
    expect(() => parseTokenFloorPort(value)).toThrow(/1 to 65535/);
  });

  it.each(["1", "8080", "65535"])("accepts %s", (value) => {
    expect(parseTokenFloorPort(value)).toBe(Number(value));
  });
});
