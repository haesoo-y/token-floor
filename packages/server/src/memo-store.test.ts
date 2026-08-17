import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { JsonMemoStore, MemoNotArchivedError, MemoNotFoundError } from "./memo-store.js";

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0)) fs.rmSync(directory, { recursive: true });
});

function createStore(): { filename: string; store: JsonMemoStore } {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "token-floor-memos-"));
  directories.push(directory);
  const filename = path.join(directory, ".token-floor", "memos.json");
  return { filename, store: new JsonMemoStore(filename) };
}

describe("JsonMemoStore", () => {
  it("atomically creates and restores a versioned memo document", () => {
    const { filename, store } = createStore();
    const memo = store.create("  Remember this  ", new Date("2026-08-17T00:00:00.000Z"));

    expect(store.load().memos).toEqual([memo]);
    expect(memo).toMatchObject({ text: "Remember this", archived: false });
    expect(JSON.parse(fs.readFileSync(filename, "utf8"))).toMatchObject({ version: 1 });
    expect(fs.existsSync(`${filename}.tmp`)).toBe(false);
  });

  it("edits and archives a memo without replacing its identity", () => {
    const { store } = createStore();
    const created = store.create("Draft", new Date("2026-08-17T00:00:00.000Z"));
    const updated = store.update(
      created.id,
      { text: "Final", archived: true },
      new Date("2026-08-17T01:00:00.000Z")
    );

    expect(updated).toMatchObject({ id: created.id, text: "Final", archived: true });
    expect(updated.updatedAt).toBe("2026-08-17T01:00:00.000Z");
  });

  it("rejects invalid text and unknown memo ids", () => {
    const { store } = createStore();
    expect(() => store.create(" ")).toThrow(TypeError);
    expect(() => store.create("x".repeat(1_001))).toThrow(TypeError);
    expect(() => store.update("missing", { archived: true })).toThrow(MemoNotFoundError);
  });

  it("deletes a memo while preserving the remaining document", () => {
    const { store } = createStore();
    const first = store.create("First");
    const second = store.create("Second");
    expect(() => store.delete(first.id)).toThrow(MemoNotArchivedError);
    const archived = store.update(first.id, { archived: true });
    expect(store.delete(first.id)).toEqual(archived);
    expect(store.load().memos).toEqual([second]);
    expect(() => store.delete(first.id)).toThrow(MemoNotFoundError);
  });

  it("falls back safely when the persisted document is malformed", () => {
    const { filename, store } = createStore();
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, "{broken");
    expect(store.load()).toEqual({ version: 1, memos: [] });
  });
});
