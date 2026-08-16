export type Locale = "en" | "ko" | "ja";

const messages = {
  en: {
    active: "Active",
    waiting: "Waiting",
    completed: "Completed",
    error: "Error",
    selectedAgent: "Selected agent",
    allEvents: "All events",
    noSelection: "Select an agent in the office.",
    tokenUnavailable: "Unavailable",
    assetTitle: "MetroCity assets are required",
    assetBody: "Extract both free packs into this local folder, then reload the page.",
    player: "My character",
    connected: "Live simulation",
    disconnected: "Server disconnected",
    controls: "WASD move · wheel zoom · click an agent for details"
  },
  ko: {
    active: "작업 중",
    waiting: "대기 중",
    completed: "완료",
    error: "오류",
    selectedAgent: "선택한 에이전트",
    allEvents: "전체 이벤트",
    noSelection: "오피스에서 에이전트를 선택하세요.",
    tokenUnavailable: "확인 불가",
    assetTitle: "MetroCity 에셋이 필요합니다",
    assetBody: "두 무료 팩을 아래 로컬 폴더에 압축 해제한 뒤 페이지를 새로고침하세요.",
    player: "내 캐릭터",
    connected: "실시간 시뮬레이션",
    disconnected: "서버 연결 끊김",
    controls: "WASD 이동 · 휠 확대 · 에이전트를 클릭해 상세 보기"
  },
  ja: {
    active: "作業中",
    waiting: "待機中",
    completed: "完了",
    error: "エラー",
    selectedAgent: "選択したエージェント",
    allEvents: "すべてのイベント",
    noSelection: "オフィスでエージェントを選択してください。",
    tokenUnavailable: "取得不可",
    assetTitle: "MetroCityアセットが必要です",
    assetBody: "2つの無料パックを次のローカルフォルダに展開し、再読み込みしてください。",
    player: "マイキャラクター",
    connected: "ライブシミュレーション",
    disconnected: "サーバー未接続",
    controls: "WASDで移動 · ホイールでズーム · エージェントをクリック"
  }
} as const;

export type MessageKey = keyof (typeof messages)["en"];

export function translate(locale: Locale, key: MessageKey): string {
  return messages[locale][key];
}
