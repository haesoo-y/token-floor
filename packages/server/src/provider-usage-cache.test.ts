import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { UsageUpdatedEvent } from "@token-floor/protocol";
import { readProviderUsageCache, updateProviderUsageCache } from "./provider-usage-cache.js";

const claudeEvent: UsageUpdatedEvent = {
  schemaVersion: 1,
  eventId: "claude-usage:desktop:2026-08-17T00:00:00.000Z",
  occurredAt: "2026-08-17T00:00:00.000Z",
  provider: "claude-code",
  sessionId: "desktop",
  type: "usage.updated",
  usage: { capability: "weekly-percentage", remainingPercent: 75 }
};

describe("provider usage cache", () => {
  it("atomically persists and validates normalized provider events", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "token-floor-cache-"));
    const filename = path.join(directory, "provider-usage.json");
    expect(updateProviderUsageCache(filename, [claudeEvent]).changed).toBe(true);
    expect(readProviderUsageCache(filename)).toEqual([claudeEvent]);
    expect(fs.statSync(filename).mode & 0o777).toBe(0o600);
    expect(fs.readdirSync(directory)).toEqual(["provider-usage.json"]);
    fs.rmSync(directory, { recursive: true });
  });

  it("does not rewrite unchanged data and keeps the last valid snapshot", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "token-floor-cache-"));
    const filename = path.join(directory, "provider-usage.json");
    updateProviderUsageCache(filename, [claudeEvent], new Date("2026-08-17T00:00:01.000Z"));
    const before = fs.readFileSync(filename, "utf8");
    expect(updateProviderUsageCache(filename, []).changed).toBe(false);
    expect(updateProviderUsageCache(filename, [claudeEvent]).changed).toBe(false);
    expect(fs.readFileSync(filename, "utf8")).toBe(before);
    fs.rmSync(directory, { recursive: true });
  });

  it("rejects stale updates but accepts a richer entry from the same refresh", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "token-floor-cache-"));
    const filename = path.join(directory, "provider-usage.json");
    const current = { ...claudeEvent, occurredAt: "2026-08-17T00:01:00.000Z" };
    updateProviderUsageCache(filename, [current]);
    expect(updateProviderUsageCache(filename, [claudeEvent]).changed).toBe(false);
    const richer = {
      ...current,
      occurredAt: "2026-08-17T00:00:59.998Z",
      usage: { ...current.usage, resetsAt: "2026-08-21T07:00:00.000Z" }
    };
    expect(updateProviderUsageCache(filename, [richer]).changed).toBe(true);
    expect(readProviderUsageCache(filename)).toEqual([richer]);
    fs.rmSync(directory, { recursive: true });
  });

  it("rejects malformed cached events", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "token-floor-cache-"));
    const filename = path.join(directory, "provider-usage.json");
    fs.writeFileSync(filename, JSON.stringify({ schemaVersion: 1, providers: { codex: {} } }));
    expect(readProviderUsageCache(filename)).toEqual([]);
    fs.rmSync(directory, { recursive: true });
  });
});
