import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

fs.chmodSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist/cli.js"), 0o755);
