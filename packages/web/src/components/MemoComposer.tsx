import { useState, type KeyboardEvent } from "react";
import { translate, type Locale } from "../lib/i18n.js";

export function MemoComposer({
  locale,
  onCreate
}: {
  locale: Locale;
  onCreate: (text: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!text.trim() || saving) return;
    setSaving(true);
    try {
      await onCreate(text);
      setText("");
    } finally {
      setSaving(false);
    }
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void submit();
    }
  };
  return (
    <section className="memo-composer">
      <textarea
        value={text}
        maxLength={1_000}
        placeholder={translate(locale, "memoPlaceholder")}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      <div className="memo-composer-footer">
        <span>{text.length} / 1000</span>
        <div>
          <small>⌘ / Ctrl + Enter</small>
          <button type="button" disabled={!text.trim() || saving} onClick={() => void submit()}>
            {translate(locale, "addMemo")}
          </button>
        </div>
      </div>
    </section>
  );
}
