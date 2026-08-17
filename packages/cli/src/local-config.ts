import fs from "node:fs";
import path from "node:path";
import { parseTokenFloorPort } from "@token-floor/protocol";

export interface LocalConfig {
  version: 1;
  port: number;
}

export type ConfigRead =
  { status: "missing" } | { status: "malformed" } | { status: "valid"; config: LocalConfig };

export function readLocalConfig(filename: string): ConfigRead {
  if (!fs.existsSync(filename)) return { status: "missing" };
  try {
    const value = JSON.parse(fs.readFileSync(filename, "utf8")) as Partial<LocalConfig>;
    if (value.version !== 1 || typeof value.port !== "number") return { status: "malformed" };
    return {
      status: "valid",
      config: { version: 1, port: parseTokenFloorPort(String(value.port)) }
    };
  } catch {
    return { status: "malformed" };
  }
}

export function writeLocalConfig(filename: string, config: LocalConfig): void {
  const directory = path.dirname(filename);
  if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const stat = fs.lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error("Token Floor runtime root must be a regular directory");
  }
  fs.chmodSync(directory, 0o700);
  const temporary = `${filename}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600, flag: "wx" });
  fs.renameSync(temporary, filename);
}
