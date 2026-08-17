import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readStyle = (name: string) => readFileSync(new URL(`./${name}.css`, import.meta.url), "utf8");

describe("overlay transparency", () => {
  it("shares translucent panel, bubble, and label surfaces", () => {
    const base = readStyle("base");
    const combined = [base, readStyle("panels"), readStyle("character"), readStyle("stage")].join(
      "\n"
    );

    expect(base).toContain("--panel: #0c0f14b8");
    expect(base).toContain("--chat-panel: #0c0f1480");
    expect(base).toContain("--bubble: #05070a80");
    expect(base).toContain("--label: #05070a80");
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
