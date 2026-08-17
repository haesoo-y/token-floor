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
    expect(base).toContain("--panel: #0d2033d9");
    expect(base).toContain("--chat-panel: #0d2033c7");
    expect(base).toContain("--bubble: #0a1a2ae6");
    expect(base).toContain("--label: #0a1a2ae6");
    expect(base).toContain("--control: #13283d");
    expect(base).toContain("--control-active: #1b3853d9");
    expect(base).toContain("--lime: #8bc34a");
    expect(base).toContain("--lime-soft: #8bc34a14");
    expect(base).toContain("--lime-ring: #8bc34a40");
    expect(combined).not.toMatch(/#5eead4|#55d6be|#67e8f9|var\(--mint\)/i);
    expect(base).not.toMatch(/#09090b|#0c0f14|#05070a|#171a20|#282d36/);
    expect(combined.match(/background: var\(--panel\)/g)).toHaveLength(3);
    expect(combined).toContain("background: var(--chat-panel)");
    expect(combined).toContain("background: var(--bubble)");
    expect(combined).toContain("background: var(--label)");

    const chatPanelRule = readStyle("panels").match(/\.chat-panel\s*\{([^}]+)\}/)?.[1] ?? "";
    expect(chatPanelRule).toContain("width: min(468px, calc(100vw - 36px))");
    expect(chatPanelRule).toContain("height: min(600px, calc(100vh - 120px))");
    expect(chatPanelRule).not.toContain("backdrop-filter");
    expect(chatPanelRule).not.toContain("box-shadow");
    expect(readStyle("panels")).toContain(".chat-row.assistant.claude-code strong");
    expect(readStyle("panels")).toContain(".event-row.claude-code span");
    expect(readStyle("panels")).toContain('.ui-tabs-content[data-state="inactive"]');
    expect(readStyle("panel-controls")).toContain(".chat-panel.is-minimized");
    expect(readStyle("stage")).not.toContain("control-hint");
  });
});
