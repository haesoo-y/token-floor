import { describe, expect, it } from "vitest";
import { parseCli } from "./cli-parser.js";

describe("CLI parser", () => {
  it("defaults to start and accepts command port forms", () => {
    expect(parseCli([]).command).toBe("start");
    expect(parseCli(["--port", "8080"])).toMatchObject({ command: "start", port: "8080" });
    expect(parseCli(["start", "--port", "8080"])).toMatchObject({ command: "start", port: "8080" });
    expect(parseCli(["install", "--port", "8080"])).toMatchObject({
      command: "install",
      port: "8080"
    });
  });

  it("rejects missing values, unknown flags, and misplaced deletion", () => {
    expect(() => parseCli(["--port"])).toThrow(/needs a value/);
    expect(() => parseCli(["--wat"])).toThrow(/Unknown option/);
    expect(() => parseCli(["start", "--delete-local-data"])).toThrow(/only valid/);
    expect(() => parseCli(["start", "--port", "1", "--port", "2"])).toThrow(
      /only be provided once/
    );
    expect(() => parseCli(["uninstall", "--port", "8080"])).toThrow(/not valid/);
  });
});
