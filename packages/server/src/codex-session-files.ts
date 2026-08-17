import fs from "node:fs";
import path from "node:path";

const DEFAULT_LOOKBACK_MS = 24 * 60 * 60 * 1000;
const MAX_FILES = 96;

/** Finds a bounded set of recent or already tracked provider session files. */
export function recentCodexSessionFiles(
  root: string,
  now = new Date(),
  tracked: ReadonlySet<string> = new Set()
): string[] {
  const files: Array<{ filename: string; mtimeMs: number }> = [];
  const visit = (directory: string) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(filename);
      else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
        try {
          const mtimeMs = fs.statSync(filename).mtimeMs;
          if (tracked.has(filename) || now.getTime() - mtimeMs <= DEFAULT_LOOKBACK_MS) {
            files.push({ filename, mtimeMs });
          }
        } catch {
          // Files may disappear between directory enumeration and stat.
        }
      }
    }
  };
  visit(root);
  return files
    .sort((left, right) => right.mtimeMs - left.mtimeMs)
    .slice(0, MAX_FILES)
    .map((item) => item.filename);
}
