import fs from "node:fs";

/** Creates or validates a Token Floor-owned private directory without following a symlink root. */
export function ensurePrivateDirectory(directory: string): void {
  if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const stat = fs.lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error("Token Floor runtime root must be a regular directory");
  }
  fs.chmodSync(directory, 0o700);
}
