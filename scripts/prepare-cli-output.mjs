import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
fs.rmSync(path.join(root, "dist", "cli.js"), { force: true });
fs.rmSync(path.join(root, "dist", "chunks"), { force: true, recursive: true });
