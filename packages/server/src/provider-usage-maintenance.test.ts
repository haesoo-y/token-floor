import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { NormalizedEvent } from "@token-floor/protocol";
import { readProviderUsageCache } from "./provider-usage-cache.js";
import { startProviderUsageMaintenance } from "./provider-usage-maintenance.js";

describe("startProviderUsageMaintenance", () => {
  it("projects provider data only after persisting it to the normalized cache", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "token-floor-maintenance-"));
    const source = path.join(directory, "plan-usage-history.json");
    const cache = path.join(directory, ".token-floor", "provider-usage.json");
    fs.writeFileSync(
      source,
      JSON.stringify({ samples: [{ t: 1_786_944_000_000, org: "private", u: { sd: 26 } }] })
    );
    const accepted: NormalizedEvent[] = [];
    const stop = startProviderUsageMaintenance({
      cachePath: cache,
      claudeUsagePath: source,
      acceptEvent: (event) => accepted.push(event),
      intervalMs: 60_000
    });
    stop();

    expect(accepted).toEqual(readProviderUsageCache(cache));
    expect(accepted[0]).toMatchObject({
      provider: "claude-code",
      sessionId: "desktop",
      usage: { remainingPercent: 74 }
    });

    fs.writeFileSync(source, "partially-written-json");
    const recovered: NormalizedEvent[] = [];
    const stopRecovered = startProviderUsageMaintenance({
      cachePath: cache,
      claudeUsagePath: source,
      acceptEvent: (event) => recovered.push(event),
      intervalMs: 60_000
    });
    stopRecovered();
    expect(recovered).toEqual(accepted);
    fs.rmSync(directory, { recursive: true });
  });
});
