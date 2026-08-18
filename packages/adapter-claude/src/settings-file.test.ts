import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { installClaudeObservers, uninstallClaudeObservers } from "./settings-file.js";

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0)) fs.rmSync(directory, { recursive: true });
});

describe("Claude observer settings file", () => {
  it("backs up, preserves, installs, and removes only Token Floor settings", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "token-floor-settings-"));
    directories.push(directory);
    const filename = path.join(directory, "settings.json");
    const previous = { type: "command", command: "existing", padding: 2 };
    fs.writeFileSync(filename, JSON.stringify({ model: "opus", statusLine: previous }));
    expect(installClaudeObservers(filename).installed).toBe(true);
    expect(fs.existsSync(`${filename}.token-floor.backup`)).toBe(true);
    const installed = JSON.parse(fs.readFileSync(filename, "utf8"));
    expect(installed.statusLine).toEqual(previous);
    expect(uninstallClaudeObservers(filename).installed).toBe(false);
    expect(JSON.parse(fs.readFileSync(filename, "utf8"))).toMatchObject({
      model: "opus",
      statusLine: { type: "command", command: "existing", padding: 2 }
    });
  });

  it("creates a missing settings directory for a first-time installation", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "token-floor-settings-"));
    directories.push(directory);
    const filename = path.join(directory, "new-user", "settings.json");
    expect(installClaudeObservers(filename).installed).toBe(true);
    expect(fs.existsSync(filename)).toBe(true);
    expect(JSON.parse(fs.readFileSync(filename, "utf8")).statusLine.command).toContain(
      "/hooks/claude-usage"
    );
    expect(uninstallClaudeObservers(filename).installed).toBe(false);
  });

  it("does not rewrite settings when the requested observers are already installed", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "token-floor-settings-"));
    directories.push(directory);
    const filename = path.join(directory, "settings.json");
    installClaudeObservers(filename);
    fs.utimesSync(filename, 1, 1);

    expect(installClaudeObservers(filename).installed).toBe(true);
    expect(fs.statSync(filename).mtimeMs).toBe(1_000);
  });
});
