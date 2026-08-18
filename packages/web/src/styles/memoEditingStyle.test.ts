import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoot = path.resolve(import.meta.dirname, "..");

describe("memo editing typography", () => {
  it("matches editor text to the memo body without shrinking the action target", () => {
    const component = fs.readFileSync(path.join(sourceRoot, "components/MemoCard.tsx"), "utf8");
    const styles = fs.readFileSync(path.join(import.meta.dirname, "memos.css"), "utf8");

    expect(component.match(/className="memo-edit-action"/g)).toHaveLength(2);
    expect(styles).toMatch(/\.memo-panel\s*{[^}]*--memo-body-font-size:\s*12px/s);
    expect(styles).toMatch(
      /\.memo-composer textarea,\s*\.memo-card textarea\s*{[^}]*font-family:\s*inherit[^}]*font-size:\s*var\(--memo-body-font-size\)[^}]*line-height:\s*1\.5/s
    );
    expect(styles).toMatch(
      /\.memo-composer textarea::placeholder\s*{[^}]*font-size:\s*var\(--memo-body-font-size\)/s
    );
    expect(styles).toMatch(/\.memo-card p\s*{[^}]*font-size:\s*var\(--memo-body-font-size\)/s);
    expect(styles).toMatch(/\.memo-actions \.memo-edit-action\s*{[^}]*font-size:\s*10px/s);
    expect(styles).toMatch(/\.memo-actions button\s*{[^}]*min-height:\s*28px/s);
  });
});
