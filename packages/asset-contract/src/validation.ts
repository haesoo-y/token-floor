import type { AssetPackManifest } from "./manifest.js";

export interface ImageInventoryEntry {
  path: string;
  width: number;
  height: number;
}

export interface AssetValidationResult {
  valid: boolean;
  missing: string[];
  mismatched: Array<{ path: string; expected: string; actual: string }>;
  unsafe: string[];
}

/** Converts a pack-relative path to POSIX form and rejects traversal or absolute paths. */
export function normalizeAssetPath(path: string): string {
  const normalized = path.replaceAll("\\", "/").replace(/^\.\//, "");
  const parts = normalized.split("/");
  if (normalized.startsWith("/") || parts.includes("..") || /^[A-Za-z]:\//.test(normalized)) {
    throw new Error(`Unsafe asset path: ${path}`);
  }
  return parts.filter(Boolean).join("/");
}

/** Compares the installed image inventory with the versioned MetroCity asset contract. */
export function validateAssetInventory(
  manifest: AssetPackManifest,
  inventory: readonly ImageInventoryEntry[]
): AssetValidationResult {
  const unsafe: string[] = [];
  const indexed = new Map<string, ImageInventoryEntry>();
  for (const file of inventory) {
    try {
      indexed.set(normalizeAssetPath(file.path), file);
    } catch {
      unsafe.push(file.path);
    }
  }

  const missing: string[] = [];
  const mismatched: AssetValidationResult["mismatched"] = [];
  for (const expected of manifest.files) {
    const actual = indexed.get(expected.path);
    if (!actual) {
      if (expected.required) missing.push(expected.path);
      continue;
    }
    if (actual.width !== expected.width || actual.height !== expected.height) {
      mismatched.push({
        path: expected.path,
        expected: `${expected.width}x${expected.height}`,
        actual: `${actual.width}x${actual.height}`
      });
    }
  }

  return {
    valid: missing.length === 0 && mismatched.length === 0 && unsafe.length === 0,
    missing,
    mismatched,
    unsafe
  };
}
