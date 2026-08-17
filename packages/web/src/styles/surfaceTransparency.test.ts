import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readStyle = (name: string) => readFileSync(new URL(`./${name}.css`, import.meta.url), "utf8");

describe("overlay transparency", () => {
  it("shares translucent panel, bubble, and label surfaces", () => {
    const base = readStyle("base");
    const combined = [base, readStyle("panels"), readStyle("character"), readStyle("stage")].join(
      "\n"
    );

    expect(base).toContain("--page: #081522");
    expect(base).toContain("--panel: #0d2033c9");
    expect(base).toContain("--chat-panel: #0d2033dc");
    expect(base).toContain("--bubble: #0a1a2ae6");
    expect(base).toContain("--label: #0a1a2ae6");
    expect(base).toContain("--control: #13283d");
    expect(base).toContain("--control-active: #1b3853d9");
    expect(base).toContain("--lime: #7bd88f");
    expect(base).toContain("--lime-soft: #7bd88f14");
    expect(base).toContain("--lime-ring: #7bd88f40");
    expect(combined).not.toMatch(/#5eead4|#55d6be|#67e8f9|var\(--mint\)/i);
    expect(base).not.toMatch(/#09090b|#0c0f14|#05070a|#171a20|#282d36/);
    expect(combined.match(/background: var\(--panel\)/g)).toHaveLength(3);
    expect(combined).toContain("background: var(--chat-panel)");
    expect(combined).toContain("background: var(--bubble)");
    expect(combined).toContain("background: var(--label)");

    const floatingPanelRule =
      readStyle("panels").match(/\.floating-panel\s*\{([^}]+)\}/)?.[1] ?? "";
    expect(floatingPanelRule).toContain("width: min(400px, calc(100vw - 36px))");
    expect(floatingPanelRule).toContain("height: 70vh");
    expect(combined).not.toContain("backdrop-filter");
    expect(floatingPanelRule).toContain("box-shadow");
    expect(readStyle("panels")).toContain(".chat-row.assistant.claude-code strong");
    expect(readStyle("panels")).toContain(".event-row.claude-code span");
    expect(readStyle("panels")).toContain('.ui-tabs-content[data-state="inactive"]');
    expect(readStyle("panel-controls")).toContain(".floating-panel.is-minimized");
    expect(readStyle("stage")).not.toContain("control-hint");
    expect(readStyle("memos")).toMatch(/\.memo-footer\s*\{[^}]*display: flex;/s);
    expect(readStyle("memos")).toMatch(/\.memo-footer\s*\{[^}]*justify-content: space-between;/s);
    expect(readStyle("memos")).toMatch(/\.memo-actions\s*\{[^}]*flex: 0 0 auto;/s);
  });
});
