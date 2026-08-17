import type { Locale } from "../lib/i18n.js";

const systemPhrases = {
  en: {
    waiting: "Permission needed",
    error: "Task failed",
    working: "Working",
    coffee: "Coffee break."
  },
  ko: {
    waiting: "권한 확인이 필요해요",
    error: "작업에 실패했어요",
    working: "작업 중이에요",
    coffee: "커피 마시는 중"
  },
  ja: {
    waiting: "権限の確認が必要です",
    error: "タスクに失敗しました",
    working: "作業中です",
    coffee: "コーヒー休憩中"
  }
} as const;

export type SystemPhrase = keyof (typeof systemPhrases)["en"];

export function systemPhrase(locale: Locale, key: SystemPhrase): string {
  return systemPhrases[locale][key];
}
