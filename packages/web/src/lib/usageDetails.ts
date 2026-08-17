import type { UsageSnapshot } from "@token-floor/protocol";
import type { Locale } from "./i18n.js";

export interface UsageDetailValues {
  weekly: string;
  resetsAt: string;
  checkedAt: string;
  reason: string;
}

export function usageDetailValues(
  usage: UsageSnapshot | undefined,
  locale: Locale,
  unavailable: string
): UsageDetailValues {
  return {
    weekly: usage?.capability === "weekly-percentage" ? `${usage.remainingPercent}%` : unavailable,
    resetsAt: formatDate(usage?.resetsAt, locale),
    checkedAt: formatDate(usage?.checkedAt, locale),
    reason: usage?.unavailableReason ?? "—"
  };
}

function formatDate(value: string | undefined, locale: Locale): string {
  return value ? new Date(value).toLocaleString(locale) : "—";
}
