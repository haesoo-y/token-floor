import type { Locale } from "../lib/i18n.js";

const systemPhrases = {
  en: {
    started: "Starting now",
    waiting: "Permission needed",
    error: "Task failed",
    working: "Working",
    coffee: "Coffee break.",
    completed: "Task complete"
  },
  ko: {
    started: "작업을 시작해요",
    waiting: "권한 확인이 필요해요",
    error: "작업에 실패했어요",
    working: "작업 중이에요",
    coffee: "커피 마시는 중",
    completed: "작업을 완료했어요"
  },
  ja: {
    started: "作業を始めます",
    waiting: "権限の確認が必要です",
    error: "タスクに失敗しました",
    working: "作業中です",
    coffee: "コーヒー休憩中",
    completed: "作業が完了しました"
  }
} as const;

export type SystemPhrase = keyof (typeof systemPhrases)["en"];

export function systemPhrase(locale: Locale, key: SystemPhrase): string {
  return systemPhrases[locale][key];
}
