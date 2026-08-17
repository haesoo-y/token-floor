import { useState } from "react";
import type { Memo } from "@token-floor/protocol";
import { translate, type Locale } from "../lib/i18n.js";
import { ActionIcon } from "./common/ActionIcon.js";

export function MemoCard({
  memo,
  locale,
  onUpdate,
  onDelete
}: {
  memo: Memo;
  locale: Locale;
  onUpdate: (id: string, patch: { text?: string; archived?: boolean }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(memo.text);
  const save = async () => {
    await onUpdate(memo.id, { text });
    setEditing(false);
  };
  return (
    <article className="memo-card">
      {editing ? (
        <textarea
          value={text}
          maxLength={1_000}
          onChange={(event) => setText(event.target.value)}
        />
      ) : (
        <p className={expanded ? "is-expanded" : ""}>{memo.text}</p>
      )}
      <div className="memo-footer">
        <div className="memo-meta">
          <time dateTime={memo.updatedAt}>
            {new Date(memo.updatedAt).toLocaleString(locale, {
              dateStyle: "medium",
              timeStyle: "short"
            })}
          </time>
          {!editing && memo.text.length > 160 ? (
            <button
              className="memo-expand"
              type="button"
              onClick={() => setExpanded((value) => !value)}
            >
              {translate(locale, expanded ? "collapseMemo" : "expandMemo")}
            </button>
          ) : null}
        </div>
        <div className="memo-actions">
          {editing ? (
            <>
              <button type="button" onClick={() => void save()}>
                {translate(locale, "saveMemo")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setText(memo.text);
                  setEditing(false);
                }}
              >
                {translate(locale, "cancel")}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                title={translate(locale, "copyMemo")}
                aria-label={translate(locale, "copyMemo")}
                onClick={() => void navigator.clipboard.writeText(memo.text)}
              >
                <ActionIcon name="copy" />
              </button>
              {!memo.archived ? (
                <button
                  type="button"
                  title={translate(locale, "editMemo")}
                  aria-label={translate(locale, "editMemo")}
                  onClick={() => setEditing(true)}
                >
                  <ActionIcon name="edit" />
                </button>
              ) : null}
              <button
                type="button"
                title={translate(locale, memo.archived ? "restoreMemo" : "archiveMemo")}
                aria-label={translate(locale, memo.archived ? "restoreMemo" : "archiveMemo")}
                onClick={() => void onUpdate(memo.id, { archived: !memo.archived })}
              >
                <ActionIcon name={memo.archived ? "restore" : "archive"} />
              </button>
              {memo.archived ? (
                <button
                  type="button"
                  className="is-destructive"
                  title={translate(locale, "deleteMemo")}
                  aria-label={translate(locale, "deleteMemo")}
                  onClick={() => {
                    if (window.confirm(translate(locale, "confirmDeleteMemo")))
                      void onDelete(memo.id);
                  }}
                >
                  <ActionIcon name="delete" />
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </article>
  );
}
