import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { diagnoseTokenFloor } from "./diagnostics.js";

describe("diagnose", () => {
  it("is read-only and reports absent providers as not installed", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-floor-diagnose-"));
    const cwd = path.join(root, "project");
    const home = path.join(root, "home");
    fs.mkdirSync(cwd);
    const before = fs.readdirSync(root);
    const lines = await diagnoseTokenFloor({
      cwd,
      home,
      port: 65_000,
      webRootPath: path.join(root, "web")
    });
    expect(lines).toContain("claude-code: not installed");
    expect(lines).toContain("codex: not installed");
    expect(lines.join("\n")).not.toContain(root);
    expect(fs.readdirSync(root)).toEqual(before);
  });
});
