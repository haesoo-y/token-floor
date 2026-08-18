import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { runCli, type CliRuntime } from "./run.js";

function runtime(argv: string[]): { value: CliRuntime; output: string[]; errors: string[] } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-floor-run-"));
  const output: string[] = [];
  const errors: string[] = [];
  return {
    value: {
      argv,
      cwd: root,
      home: path.join(root, "home"),
      webRootPath: path.join(root, "web"),
      write: (line) => output.push(line),
      writeError: (line) => errors.push(line)
    },
    output,
    errors
  };
}

describe("CLI commands", () => {
  it("automatically prepares Claude observation during normal startup", async () => {
    const started = runtime([]);
    const close = vi.fn(async () => undefined);
    const settings = path.join(started.value.home, ".claude", "settings.json");
    fs.mkdirSync(path.dirname(settings), { recursive: true });
    started.value.startServer = vi.fn(async () => {
      expect(fs.existsSync(settings)).toBe(false);
      return { url: "http://127.0.0.1:10214", close };
    });
    started.value.waitForShutdown = async (stop) => {
      await stop();
      return 0;
    };

    expect(await runCli(started.value)).toBe(0);
    expect(started.value.startServer).toHaveBeenCalledWith(
      expect.objectContaining({ port: 10_214 })
    );
    expect(started.output).toContain("Claude observer: ready");
    expect(fs.readFileSync(settings, "utf8")).toContain("/hooks/claude");
    expect(close).toHaveBeenCalledOnce();
  });

  it("keeps Codex startup available when automatic Claude setup fails", async () => {
    const started = runtime([]);
    const settings = path.join(started.value.home, ".claude", "settings.json");
    fs.mkdirSync(path.dirname(settings), { recursive: true });
    fs.writeFileSync(settings, "not-json");
    started.value.startServer = vi.fn(async () => ({
      url: "http://127.0.0.1:10214",
      close: async () => undefined
    }));
    started.value.waitForShutdown = async (stop) => {
      await stop();
      return 0;
    };

    expect(await runCli(started.value)).toBe(0);
    expect(started.errors[0]).toContain("Codex observation continues");
    expect(started.output).toContain("Token Floor: http://127.0.0.1:10214");
  });

  it("prints help and version without filesystem changes", async () => {
    const help = runtime(["--help"]);
    expect(await runCli(help.value)).toBe(0);
    expect(help.output.join("\n")).toContain("token-floor install");
    const version = runtime(["--version"]);
    expect(await runCli(version.value)).toBe(0);
    expect(version.output).toEqual(["0.2.0"]);
  });

  it("honors environment over installed config and CLI over environment", async () => {
    const installed = runtime(["install", "--port", "6000"]);
    expect(await runCli(installed.value)).toBe(0);
    const environment = { ...installed.value, argv: ["diagnose"], environmentPort: "7000" };
    const lines: string[] = [];
    environment.write = (line) => lines.push(line);
    expect(await runCli(environment)).toBe(0);
    expect(lines.some((line) => line.startsWith("port: 7000 ("))).toBe(true);
    environment.argv = ["diagnose", "--port", "8000"];
    lines.length = 0;
    expect(await runCli(environment)).toBe(0);
    expect(lines.some((line) => line.startsWith("port: 8000 ("))).toBe(true);
  });

  it("returns a clear nonzero code for an invalid port", async () => {
    const value = runtime(["diagnose", "--port", "0"]);
    expect(await runCli(value.value)).toBe(2);
    expect(value.errors[0]).toMatch(/1 to 65535/);
  });
});
