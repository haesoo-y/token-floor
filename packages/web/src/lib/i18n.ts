export type Locale = "en" | "ko" | "ja";

const messages = {
  en: {
    active: "Active",
    waiting: "Waiting",
    completed: "Completed",
    error: "Error",
    selectedAgent: "Selected agent",
    chatLog: "Chat log",
    allEvents: "All events",
    activityPanel: "Activity panel",
    minimizePanel: "Minimize activity panel",
    restorePanel: "Restore activity panel",
    noSelection: "Select an agent in the office.",
    tokenUnavailable: "Unavailable",
    assetTitle: "MetroCity assets are required",
    assetBody: "Extract both free packs into this local folder, then reload the page.",
    player: "My character",
    connected: "Live office",
    disconnected: "Server disconnected",
    usageDetails: "Weekly usage details",
    weeklyLeft: "Weekly left",
    fiveHourLeft: "5-hour left",
    lastSyncedAt: "Last synced",
    resetsAt: "Reset date"
  },
  ko: {
    active: "작업 중",
    waiting: "대기 중",
    completed: "완료",
    error: "오류",
    selectedAgent: "선택한 에이전트",
    chatLog: "채팅 로그",
    allEvents: "전체 이벤트",
    activityPanel: "활동 패널",
    minimizePanel: "활동 패널 최소화",
    restorePanel: "활동 패널 복원",
    noSelection: "오피스에서 에이전트를 선택하세요.",
    tokenUnavailable: "확인 불가",
    assetTitle: "MetroCity 에셋이 필요합니다",
    assetBody: "두 무료 팩을 아래 로컬 폴더에 압축 해제한 뒤 페이지를 새로고침하세요.",
    player: "내 캐릭터",
    connected: "실시간 오피스",
    disconnected: "서버 연결 끊김",
    usageDetails: "주간 사용량 상세",
    weeklyLeft: "주간 잔여",
    fiveHourLeft: "5시간 잔여",
    lastSyncedAt: "마지막 동기화",
    resetsAt: "초기화 날짜"
  },
  ja: {
    active: "作業中",
    waiting: "待機中",
    completed: "完了",
    error: "エラー",
    selectedAgent: "選択したエージェント",
    chatLog: "チャットログ",
    allEvents: "すべてのイベント",
    activityPanel: "アクティビティパネル",
    minimizePanel: "アクティビティパネルを最小化",
    restorePanel: "アクティビティパネルを復元",
    noSelection: "オフィスでエージェントを選択してください。",
    tokenUnavailable: "取得不可",
    assetTitle: "MetroCityアセットが必要です",
    assetBody: "2つの無料パックを次のローカルフォルダに展開し、再読み込みしてください。",
    player: "マイキャラクター",
    connected: "ライブオフィス",
    disconnected: "サーバー未接続",
    usageDetails: "週間使用量の詳細",
    weeklyLeft: "週間残量",
    fiveHourLeft: "5時間残量",
    lastSyncedAt: "最終同期",
    resetsAt: "リセット日時"
  }
} as const;

export type MessageKey = keyof (typeof messages)["en"];

export function translate(locale: Locale, key: MessageKey): string {
  return messages[locale][key];
}
