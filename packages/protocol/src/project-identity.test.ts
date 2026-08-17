import { describe, expect, it } from "vitest";
import { createOpaqueProjectIdentity } from "./project-identity.js";

describe("createOpaqueProjectIdentity", () => {
  it("keeps provider paths out of the normalized identity", () => {
    const project = createOpaqueProjectIdentity("codex", "/Users/example/private-project");
    expect(project).toMatchObject({ label: "private-project" });
    expect(project.id).toMatch(/^project:codex:[0-9a-f]{16}$/);
    expect(JSON.stringify(project)).not.toContain("/Users/");
  });

  it("is stable, provider scoped, and avoids exposing a home-root username", () => {
    const first = createOpaqueProjectIdentity("codex", "/home/example");
    expect(first).toEqual(createOpaqueProjectIdentity("codex", "/home/example"));
    expect(first.id).not.toBe(createOpaqueProjectIdentity("claude-code", "/home/example").id);
    expect(first.label).toBe("Project");
  });

  it("does not hash an identity that already satisfies the opaque contract", () => {
    const id = "project:codex:0123456789abcdef";
    expect(createOpaqueProjectIdentity("codex", id, "token-floor")).toEqual({
      id,
      label: "token-floor"
    });
  });
});
