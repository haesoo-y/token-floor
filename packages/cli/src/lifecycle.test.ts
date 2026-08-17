import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { installTokenFloor, uninstallTokenFloor } from "./lifecycle.js";

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-floor-cli-"));
  return { cwd: path.join(root, "project"), home: path.join(root, "home") };
}

describe("CLI lifecycle ownership", () => {
  it.each([
    [true, true],
    [true, false],
    [false, true],
    [false, false]
  ])("handles Claude=%s Codex=%s independently", (claude, codex) => {
    const value = fixture();
    fs.mkdirSync(value.cwd);
    if (claude) fs.mkdirSync(path.join(value.home, ".claude"), { recursive: true });
    if (codex) fs.mkdirSync(path.join(value.home, ".codex"), { recursive: true });
    const lines = installTokenFloor({ ...value, port: 8080 });
    expect(lines).toContain(`codex: ${codex ? "detected" : "not installed"}`);
    expect(fs.existsSync(path.join(value.home, ".claude", "settings.json"))).toBe(claude);
    expect(fs.existsSync(path.join(value.home, ".codex"))).toBe(codex);
  });

  it("does not create absent provider directories", () => {
    const value = fixture();
    fs.mkdirSync(value.cwd);
    expect(installTokenFloor({ ...value, port: 8080 })).toContain("claude-code: not installed");
    expect(fs.existsSync(path.join(value.home, ".claude"))).toBe(false);
  });

  it("updates owned hooks, preserves user settings, and uninstalls idempotently", () => {
    const value = fixture();
    const settings = path.join(value.home, ".claude", "settings.json");
    fs.mkdirSync(path.dirname(settings), { recursive: true });
    fs.mkdirSync(value.cwd);
    fs.writeFileSync(
      settings,
      JSON.stringify({ model: "opus", statusLine: { type: "command", command: "mine" } })
    );
    installTokenFloor({ ...value, port: 8080 });
    installTokenFloor({ ...value, port: 9090 });
    expect(fs.readFileSync(settings, "utf8")).toContain("9090");
    expect(fs.readFileSync(settings, "utf8")).not.toContain("8080");
    uninstallTokenFloor({ ...value, deleteLocalData: false });
    uninstallTokenFloor({ ...value, deleteLocalData: false });
    expect(JSON.parse(fs.readFileSync(settings, "utf8"))).toMatchObject({ model: "opus" });
  });

  it("preserves data unless explicit deletion is requested", () => {
    const value = fixture();
    const runtime = path.join(value.cwd, ".token-floor");
    fs.mkdirSync(runtime, { recursive: true });
    fs.writeFileSync(path.join(runtime, "memos.json"), "{}");
    uninstallTokenFloor({ ...value, deleteLocalData: false });
    expect(fs.existsSync(path.join(runtime, "memos.json"))).toBe(true);
    uninstallTokenFloor({ ...value, deleteLocalData: true });
    expect(fs.existsSync(runtime)).toBe(false);
  });

  it("refuses a symlinked runtime deletion target", () => {
    const value = fixture();
    const outside = path.join(path.dirname(value.cwd), "outside");
    fs.mkdirSync(value.cwd);
    fs.mkdirSync(outside);
    fs.symlinkSync(outside, path.join(value.cwd, ".token-floor"));
    expect(() => uninstallTokenFloor({ ...value, deleteLocalData: true })).toThrow(/non-directory/);
    expect(fs.existsSync(outside)).toBe(true);
  });
});
