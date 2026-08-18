import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { sortMemosByUpdatedAt, type Memo, type MemoDocument } from "@token-floor/protocol";
import { ensurePrivateDirectory } from "./private-files.js";

const EMPTY_DOCUMENT: MemoDocument = { version: 1, memos: [] };

/** Owns validated, atomic persistence for user-authored whiteboard memos. */
export class JsonMemoStore {
  constructor(private readonly filename: string) {}

  load(): MemoDocument {
    try {
      const value = JSON.parse(fs.readFileSync(this.filename, "utf8")) as unknown;
      return isMemoDocument(value)
        ? { ...value, memos: sortMemosByUpdatedAt(value.memos) }
        : EMPTY_DOCUMENT;
    } catch {
      return EMPTY_DOCUMENT;
    }
  }

  create(text: string, now = new Date()): Memo {
    const normalized = normalizeText(text);
    const timestamp = now.toISOString();
    const memo: Memo = {
      id: randomUUID(),
      text: normalized,
      createdAt: timestamp,
      updatedAt: timestamp,
      archived: false
    };
    const document = this.load();
    this.save({ version: 1, memos: sortMemosByUpdatedAt([memo, ...document.memos]) });
    return memo;
  }

  update(id: string, patch: { text?: string; archived?: boolean }, now = new Date()): Memo {
    const document = this.load();
    const index = document.memos.findIndex((memo) => memo.id === id);
    if (index < 0) throw new MemoNotFoundError();
    const current = document.memos[index]!;
    const memo: Memo = {
      ...current,
      text: patch.text === undefined ? current.text : normalizeText(patch.text),
      archived: patch.archived ?? current.archived,
      updatedAt: now.toISOString()
    };
    const memos = [...document.memos];
    memos[index] = memo;
    this.save({ version: 1, memos: sortMemosByUpdatedAt(memos) });
    return memo;
  }

  delete(id: string): Memo {
    const document = this.load();
    const memo = document.memos.find((item) => item.id === id);
    if (!memo) throw new MemoNotFoundError();
    if (!memo.archived) throw new MemoNotArchivedError();
    this.save({ version: 1, memos: document.memos.filter((item) => item.id !== id) });
    return memo;
  }

  private save(document: MemoDocument): void {
    ensurePrivateDirectory(path.dirname(this.filename));
    const temporary = `${this.filename}.${randomUUID()}.tmp`;
    fs.writeFileSync(temporary, `${JSON.stringify(document, null, 2)}\n`, {
      mode: 0o600,
      flag: "wx"
    });
    fs.renameSync(temporary, this.filename);
  }
}

export class MemoNotFoundError extends Error {}
export class MemoNotArchivedError extends Error {}

function normalizeText(value: string): string {
  const text = value.trim();
  if (!text || text.length > 1_000) throw new TypeError("Memo text must be 1-1000 characters");
  return text;
}

function isMemoDocument(value: unknown): value is MemoDocument {
  if (!value || typeof value !== "object") return false;
  const document = value as Partial<MemoDocument>;
  return document.version === 1 && Array.isArray(document.memos) && document.memos.every(isMemo);
}

function isMemo(value: unknown): value is Memo {
  if (!value || typeof value !== "object") return false;
  const memo = value as Partial<Memo>;
  return (
    typeof memo.id === "string" &&
    typeof memo.text === "string" &&
    typeof memo.createdAt === "string" &&
    typeof memo.updatedAt === "string" &&
    typeof memo.archived === "boolean"
  );
}
