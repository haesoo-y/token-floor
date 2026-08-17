import {
  decodeCodexRecord,
  type CodexLifecycleRecord,
  type CodexSessionRecord
} from "@token-floor/adapter-codex";

/** Isolates malformed JSONL rows while preserving every later complete provider record. */
export function decodeCodexLines(
  lines: readonly string[],
  onMalformed: () => void
): Array<CodexSessionRecord | CodexLifecycleRecord> {
  const records: Array<CodexSessionRecord | CodexLifecycleRecord> = [];
  for (const line of lines) {
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      onMalformed();
      continue;
    }
    const record = decodeCodexRecord(value);
    // Valid provider records outside the normalized lifecycle contract are intentionally ignored.
    if (record) records.push(record);
  }
  return records;
}

export function latestCodexRecordAt(
  records: readonly (CodexSessionRecord | CodexLifecycleRecord)[],
  current?: string
): string | undefined {
  return records.reduce<string | undefined>(
    (latest, record) => (!latest || record.timestamp > latest ? record.timestamp : latest),
    current
  );
}
