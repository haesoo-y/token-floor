import os from "node:os";
import path from "node:path";
import { resolveTokenFloorPort } from "@token-floor/protocol";
import { resolveRuntimePaths } from "@token-floor/server/runtime-paths";
import { parseCli } from "./cli-parser.js";
import { diagnoseTokenFloor } from "./diagnostics.js";
import { HELP, VERSION } from "./help.js";
import { installTokenFloor, uninstallTokenFloor } from "./lifecycle.js";
import { readLocalConfig } from "./local-config.js";

export interface CliRuntime {
  argv: string[];
  cwd: string;
  home: string;
  environmentPort?: string;
  webRootPath: string;
  write: (line: string) => void;
  writeError: (line: string) => void;
}

export async function runCli(runtime: CliRuntime): Promise<number> {
  try {
    const options = parseCli(runtime.argv);
    if (options.help) return (runtime.write(HELP), 0);
    if (options.version) return (runtime.write(VERSION), 0);
    if (options.command === "uninstall") {
      uninstallTokenFloor({
        cwd: runtime.cwd,
        home: runtime.home,
        deleteLocalData: options.deleteLocalData
      }).forEach(runtime.write);
      return 0;
    }
    const port = resolvePort(runtime, options.port);
    if (options.command === "install") {
      installTokenFloor({ cwd: runtime.cwd, home: runtime.home, port }).forEach(runtime.write);
      return 0;
    }
    if (options.command === "diagnose") {
      (await diagnoseTokenFloor({ ...runtime, port })).forEach(runtime.write);
      return 0;
    }
    return await runStart(runtime, port);
  } catch (error) {
    runtime.writeError(error instanceof Error ? error.message : "Token Floor failed");
    return 2;
  }
}

export function defaultRuntime(argv = process.argv.slice(2)): CliRuntime {
  return {
    argv,
    cwd: process.cwd(),
    home: os.homedir(),
    ...(process.env.TOKEN_FLOOR_PORT === undefined
      ? {}
      : { environmentPort: process.env.TOKEN_FLOOR_PORT }),
    webRootPath: path.join(import.meta.dirname, "web"),
    write: (line) => console.log(line),
    writeError: (line) => console.error(line)
  };
}

function resolvePort(runtime: CliRuntime, cliPort: string | undefined): number {
  const config = readLocalConfig(resolveRuntimePaths(runtime.cwd).config);
  if (
    config.status === "malformed" &&
    cliPort === undefined &&
    runtime.environmentPort === undefined
  ) {
    throw new Error("Installed config is malformed; run token-floor install --port <port>");
  }
  return resolveTokenFloorPort({
    ...(cliPort === undefined ? {} : { cli: cliPort }),
    ...(runtime.environmentPort === undefined ? {} : { environment: runtime.environmentPort }),
    ...(config.status === "valid" ? { installed: config.config.port } : {})
  });
}

async function runStart(runtime: CliRuntime, port: number): Promise<number> {
  const { startTokenFloor } = await import("@token-floor/server/start");
  const app = await startTokenFloor({
    port,
    cwd: runtime.cwd,
    home: runtime.home,
    webRootPath: runtime.webRootPath
  });
  runtime.write(`Token Floor: ${app.url}`);
  runtime.write(`Press Ctrl+C to stop.`);
  return new Promise((resolve) => {
    let closing = false;
    const close = () => {
      if (closing) return;
      closing = true;
      void app.close().then(
        () => resolve(0),
        () => resolve(1)
      );
    };
    process.once("SIGINT", close);
    process.once("SIGTERM", close);
  });
}
