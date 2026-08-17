import { useMemo, useState } from "react";
import type { Memo } from "@token-floor/protocol";
import { translate, type Locale } from "../lib/i18n.js";
import { FloatingPanel } from "./common/FloatingPanel.js";
import { MemoCard } from "./MemoCard.js";
import { MemoComposer } from "./MemoComposer.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/Tabs.js";

export function MemoPanel({
  open,
  memos,
  loading,
  error,
  locale,
  onClose,
  onRefresh,
  onCreate,
  onUpdate,
  onDelete
}: {
  open: boolean;
  memos: Memo[];
  loading: boolean;
  error: string | undefined;
  locale: Locale;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onCreate: (text: string) => Promise<void>;
  onUpdate: (id: string, patch: { text?: string; archived?: boolean }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [tab, setTab] = useState<"memos" | "archive">("memos");
  const active = useMemo(() => memos.filter((memo) => !memo.archived), [memos]);
  const archived = useMemo(() => memos.filter((memo) => memo.archived), [memos]);
  if (!open) return null;
  const visible = tab === "memos" ? active : archived;
  return (
    <FloatingPanel placement="left" className="memo-panel">
      <header className="memo-titlebar">
        <div className="memo-title-actions">
          <button
            type="button"
            className="panel-toggle"
            aria-label={translate(locale, "refreshMemos")}
            onClick={() => void onRefresh()}
          >
            ↻
          </button>
          <button
            type="button"
            className="panel-toggle"
            aria-label={translate(locale, "closeMemos")}
            onClick={onClose}
          >
            ×
          </button>
        </div>
      </header>
      <MemoComposer locale={locale} onCreate={onCreate} />
      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as "memos" | "archive")}
        className="memo-tabs"
      >
        <TabsList>
          <TabsTrigger value="memos">
            {translate(locale, "memos")} {active.length}
          </TabsTrigger>
          <TabsTrigger value="archive">
            {translate(locale, "archive")} {archived.length}
          </TabsTrigger>
        </TabsList>
        {(["memos", "archive"] as const).map((value) => (
          <TabsContent key={value} value={value} className="memo-list">
            {loading ? (
              <p className="empty">Loading…</p>
            ) : error ? (
              <p className="empty">
                {translate(
                  locale,
                  error === "memoSaveFailed" ? "memoSaveFailed" : "memoLoadFailed"
                )}
              </p>
            ) : visible.length === 0 ? (
              <p className="empty">{translate(locale, "noMemos")}</p>
            ) : (
              visible.map((memo) => (
                <MemoCard
                  key={memo.id}
                  memo={memo}
                  locale={locale}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                />
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </FloatingPanel>
  );
}
