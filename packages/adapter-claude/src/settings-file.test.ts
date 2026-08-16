import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { installClaudeIntegration, uninstallClaudeIntegration } from "./settings-file.js";

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0)) fs.rmSync(directory, { recursive: true });
});

describe("Claude integration settings file", () => {
  it("backs up, preserves, installs, and removes only Token Floor settings", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "token-floor-settings-"));
    directories.push(directory);
    const filename = path.join(directory, "settings.json");
    fs.writeFileSync(filename, JSON.stringify({ model: "opus" }));
    expect(installClaudeIntegration(filename).installed).toBe(true);
    expect(fs.existsSync(`${filename}.token-floor.backup`)).toBe(true);
    expect(uninstallClaudeIntegration(filename).installed).toBe(false);
    expect(JSON.parse(fs.readFileSync(filename, "utf8"))).toMatchObject({ model: "opus" });
  });
});
