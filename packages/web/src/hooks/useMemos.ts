import { useCallback, useEffect, useState } from "react";
import type { Memo, MemoDocument } from "@token-floor/protocol";

const apiRoot = import.meta.env.VITE_TOKEN_FLOOR_API ?? "";

/** Owns the local memo API lifecycle independently from provider event streaming. */
export function useMemos() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const document = await request<MemoDocument>("/memos");
      setMemos(document.memos);
      setError(undefined);
    } catch {
      setError("memoLoadFailed");
    } finally {
      setLoading(false);
    }
  }, []);

  // The memo document is loaded once; subsequent mutations reconcile their returned record locally.
  useEffect(() => void refresh(), [refresh]);

  const createMemo = async (text: string) => {
    try {
      const memo = await request<Memo>("/memos", {
        method: "POST",
        body: JSON.stringify({ text })
      });
      setMemos((current) => [memo, ...current]);
      setError(undefined);
    } catch {
      setError("memoSaveFailed");
    }
  };
  const updateMemo = async (id: string, patch: { text?: string; archived?: boolean }) => {
    try {
      const memo = await request<Memo>(`/memos/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(patch)
      });
      setMemos((current) => current.map((item) => (item.id === memo.id ? memo : item)));
      setError(undefined);
    } catch {
      setError("memoSaveFailed");
    }
  };
  const deleteMemo = async (id: string) => {
    try {
      await request<Memo>(`/memos/${encodeURIComponent(id)}`, { method: "DELETE" });
      setMemos((current) => current.filter((item) => item.id !== id));
      setError(undefined);
    } catch {
      setError("memoSaveFailed");
    }
  };
  return { memos, loading, error, refresh, createMemo, updateMemo, deleteMemo };
}

async function request<T>(pathname: string, init?: RequestInit): Promise<T> {
  const options = init?.body ? { ...init, headers: { "Content-Type": "application/json" } } : init;
  const response = await fetch(`${apiRoot}${pathname}`, options);
  if (!response.ok) throw new Error(`Memo API failed with ${response.status}`);
  return (await response.json()) as T;
}
