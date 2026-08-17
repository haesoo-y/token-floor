import { describe, expect, it } from "vitest";
import { projectSourceStatus, sourceStatusChanged } from "./source-diagnostics.js";

const report = {
  rootExists: true,
  fileCount: 1,
  validRecordCount: 1,
  malformedRecordCount: 0,
  readErrorCount: 0
};

describe("provider source status", () => {
  it.each([
    [{ ...report, rootExists: false, fileCount: 0, validRecordCount: 0 }, "missing"],
    [{ ...report, fileCount: 0, validRecordCount: 0 }, "waiting"],
    [report, "healthy"],
    [{ ...report, malformedRecordCount: 1 }, "malformed"],
    [{ ...report, validRecordCount: 0, readErrorCount: 1 }, "disconnected"]
  ] as const)("projects structural reports independently", (input, condition) => {
    expect(projectSourceStatus("codex", input, undefined).condition).toBe(condition);
  });

  it("uses the last good value after a later malformed read", () => {
    const healthy = projectSourceStatus("claude-code", report, undefined, new Date(100));
    const stale = projectSourceStatus(
      "claude-code",
      { ...report, validRecordCount: 0, malformedRecordCount: 1 },
      healthy,
      new Date(200)
    );
    expect(stale).toMatchObject({ condition: "stale", lastSuccessAt: healthy.lastSuccessAt });
  });

  it("does not broadcast an unchanged readable source poll", () => {
    const stableReport = { ...report, latestRecordAt: "2026-08-17T00:00:00.000Z" };
    const first = projectSourceStatus("codex", stableReport, undefined, new Date(100));
    const repeat = projectSourceStatus("codex", stableReport, first, new Date(200));
    expect(sourceStatusChanged(first, repeat)).toBe(false);
  });
});
