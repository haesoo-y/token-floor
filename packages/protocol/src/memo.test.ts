import { describe, expect, it } from "vitest";
import { sortMemosByUpdatedAt, type Memo } from "./memo.js";

const memo = (id: string, updatedAt: string): Memo => ({
  id,
  text: id,
  createdAt: "2026-08-17T00:00:00.000Z",
  updatedAt,
  archived: false
});

describe("sortMemosByUpdatedAt", () => {
  it("orders memos by descending update time without mutating the source", () => {
    const source = [
      memo("older", "2026-08-17T01:00:00.000Z"),
      memo("newer", "2026-08-17T02:00:00.000Z")
    ];

    expect(sortMemosByUpdatedAt(source).map(({ id }) => id)).toEqual(["newer", "older"]);
    expect(source.map(({ id }) => id)).toEqual(["older", "newer"]);
  });

  it("uses the stable memo id as a deterministic tie breaker", () => {
    const timestamp = "2026-08-17T01:00:00.000Z";
    expect(
      sortMemosByUpdatedAt([memo("b", timestamp), memo("a", timestamp)]).map(({ id }) => id)
    ).toEqual(["a", "b"]);
  });
});
