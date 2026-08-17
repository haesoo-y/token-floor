import { describe, expect, it } from "vitest";
import type { AgentSnapshot } from "@token-floor/protocol";
import { labelForAgent, sessionTag } from "./agentLabel.js";

describe("agent labels", () => {
  it("uses a distinctive suffix instead of a shared session prefix", () => {
    expect(sessionTag("session-d12ec6c3-ed0f-4b38-bf2d-ca0d1571bac1")).toBe("1BAC1");
  });

  it("includes provider and role", () => {
    const agent = {
      provider: "codex",
      kind: "subagent",
      id: "subagent-one",
      sessionId: "session-123456"
    } as AgentSnapshot;
    expect(labelForAgent(agent)).toMatch(/^CDX-S-23456-[A-Z0-9]{3}$/);
  });
});
