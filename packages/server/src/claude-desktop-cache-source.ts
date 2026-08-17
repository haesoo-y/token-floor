import fs from "node:fs";
import path from "node:path";
import { zstdDecompressSync } from "node:zlib";
import { normalizeClaudeApiUsage } from "@token-floor/adapter-claude";
import type { UsageUpdatedEvent } from "@token-floor/protocol";

const usageUrl = Buffer.from("/usage?skip_spend=1");
const zstdMagic = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);

function recentFiles(directory: string): Array<{ filename: string; modifiedAt: Date }> {
  try {
    return fs
      .readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith("_0"))
      .map((entry) => {
        const filename = path.join(directory, entry.name);
        return { filename, modifiedAt: fs.statSync(filename).mtime };
      })
      .sort((left, right) => right.modifiedAt.getTime() - left.modifiedAt.getTime())
      .slice(0, 256);
  } catch {
    return [];
  }
}

function decodeUsageEntry(filename: string): unknown {
  const content = fs.readFileSync(filename);
  const urlOffset = content.indexOf(usageUrl);
  if (urlOffset < 0) return undefined;
  const compressedOffset = content.indexOf(zstdMagic, urlOffset + usageUrl.length);
  if (compressedOffset < 0) return undefined;
  return JSON.parse(zstdDecompressSync(content.subarray(compressedOffset)).toString("utf8"));
}

/** Reads the newest valid Claude usage response from Chromium's local HTTP cache. */
export function readLatestClaudeDesktopCache(directory: string): UsageUpdatedEvent | undefined {
  for (const file of recentFiles(directory)) {
    try {
      const event = normalizeClaudeApiUsage(
        decodeUsageEntry(file.filename),
        file.modifiedAt,
        "desktop-http-cache"
      );
      if (event) return event;
    } catch {
      continue;
    }
  }
  return undefined;
}
