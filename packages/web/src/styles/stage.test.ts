import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("./stage.css", import.meta.url), "utf8");

describe("actor bubble styles", () => {
  it("wraps long and unbroken dialogue inside the bubble", () => {
    const bubbleRule = styles.match(/\.actor-bubble\s*\{([^}]+)\}/)?.[1] ?? "";

    expect(bubbleRule).toContain("max-width: min(240px, calc(100vw - 32px))");
    expect(bubbleRule).toContain("overflow-wrap: anywhere");
    expect(bubbleRule).toContain("white-space: normal");
    expect(bubbleRule).not.toContain("white-space: nowrap");
  });
});
