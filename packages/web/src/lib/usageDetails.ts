import type { UsageSnapshot } from "@token-floor/protocol";
import type { Locale } from "./i18n.js";

export interface UsageDetailValues {
  weekly: string;
  fiveHour: string;
  resetsAt: string;
  lastSyncedAt: string;
}

export function usageDetailValues(
  usage: UsageSnapshot | undefined,
  locale: Locale,
  unavailable: string,
  now = new Date()
): UsageDetailValues {
  return {
    weekly:
      usage?.capability === "weekly-percentage" && typeof usage.remainingPercent === "number"
        ? `${usage.remainingPercent}%`
        : unavailable,
    fiveHour:
      typeof usage?.fiveHourRemainingPercent === "number"
        ? `${usage.fiveHourRemainingPercent}%`
        : unavailable,
    resetsAt: formatDate(usage?.resetsAt, locale, unavailable, now),
    lastSyncedAt: formatDate(usage?.checkedAt, locale, unavailable, now)
  };
}

function formatDate(
  value: string | undefined,
  locale: Locale,
  unavailable: string,
  now: Date
): string {
  if (!value) return unavailable;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return unavailable;
  const absolute = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
  const difference = date.getTime() - now.getTime();
  const magnitude = Math.abs(difference);
  if (magnitude < 60_000) {
    const justNow = { en: "just now", ko: "방금", ja: "たった今" }[locale];
    return `${absolute} (${justNow})`;
  }
  const [divisor, unit] =
    magnitude >= 86_400_000
      ? [86_400_000, "day" as const]
      : magnitude >= 3_600_000
        ? [3_600_000, "hour" as const]
        : [60_000, "minute" as const];
  const amount =
    difference < 0 ? Math.ceil(difference / divisor) : Math.floor(difference / divisor);
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: "always" }).format(amount, unit);
  return `${absolute} (${relative})`;
}
