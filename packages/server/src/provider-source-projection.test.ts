import { describe, expect, it } from "vitest";
import { applyEvent, createOfficeState } from "@token-floor/protocol";
import { applyProviderSourceReport } from "./provider-source-projection.js";

describe("applyProviderSourceReport", () => {
  it("marks a failed recovered provider stale without affecting the other provider", () => {
    const restored = applyEvent(createOfficeState(), {
      schemaVersion: 1,
      eventId: "restored-codex",
      occurredAt: "2026-08-17T00:00:00.000Z",
      provider: "codex",
      sessionId: "session",
      type: "agent.active",
      agent: { id: "codex:restored", kind: "main" },
      project: { id: "project", label: "project" },
      activity: { summary: "Working" }
    });
    const next = applyProviderSourceReport(restored, "codex", {
      rootExists: true,
      fileCount: 1,
      validRecordCount: 0,
      malformedRecordCount: 1,
      readErrorCount: 0
    });
    expect(next.sourceStatusByProvider.codex).toMatchObject({
      condition: "stale",
      lastSuccessAt: "2026-08-17T00:00:00.000Z"
    });
    expect(next.sourceStatusByProvider["claude-code"]).toBeUndefined();
  });
});
