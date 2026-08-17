import type { Locale } from "../lib/i18n.js";
import type { AgentSnapshot } from "@token-floor/protocol";
import { geekIdlePhrases } from "./geekIdlePhrases.js";
import { randomChoiceExcept } from "./randomChoice.js";
import { systemPhrase } from "./systemSpeech.js";
export { scheduledSpeaker } from "./loungeSpeaker.js";
export { systemPhrase, type SystemPhrase } from "./systemSpeech.js";

const idlePhrases: Record<Locale, readonly string[]> = {
  en: [
    "Did I commit that?",
    "This coffee could be better.",
    "I might leave early today.",
    "Nice build. Ship it?",
    "That test took forever.",
    "I need another coffee.",
    "Did the formatter run?",
    "The build looks calm today.",
    "I should clean my branches.",
    "One more task, then a break.",
    "Why is the printer awake?",
    "The lounge is unusually quiet.",
    "I forgot what I came here for.",
    "Maybe I should update the docs.",
    "That bug was sneakier than expected.",
    "I hope CI stays green.",
    "Is anyone using the meeting room?",
    "My inbox can wait five minutes.",
    "A short break was a good idea.",
    "I should check the latest logs.",
    "Did someone refill the beans?",
    "The deploy can wait until morning.",
    "I need to rename that variable.",
    "Time for a short stretch.",
    "Cache invalidation has entered the chat.",
    "The rubber duck is the senior engineer now.",
    "It was DNS. It is always DNS.",
    "That semicolon survived code review.",
    "The merge conflict chose violence.",
    "Works on my machine belongs in a museum.",
    "One does not simply exit Vim.",
    "Coffee is compiling. Please wait.",
    "Localhost is my emotional support server.",
    "The TODO just achieved sentience.",
    "After the deadline, the bug became a feature.",
    "Git blame points directly at past me.",
    "Dark mode definitely makes tests faster.",
    "I know a recursion joke about a recursion joke.",
    "Error 404: motivation not found.",
    "Deploy on Friday? Nice try.",
    "My keyboard has more crumbs than commits.",
    "Naming this variable consumed the sprint.",
    "The linter and I are taking a break.",
    "Production is staging with consequences.",
    ...geekIdlePhrases.en
  ],
  ko: [
    "내가 커밋을 했었나?",
    "커피 맛이 조금 아쉽네.",
    "오늘은 일찍 퇴근하고 싶다.",
    "빌드가 괜찮네. 배포할까?",
    "테스트가 정말 오래 걸렸네.",
    "커피를 한 잔 더 마셔야겠다.",
    "포매터를 실행했던가?",
    "오늘은 빌드가 조용하네.",
    "브랜치를 정리해야겠다.",
    "작업 하나만 더 하고 쉬자.",
    "프린터는 왜 깨어 있지?",
    "오늘 라운지가 유난히 조용하네.",
    "내가 왜 여기 왔더라?",
    "문서를 업데이트해야 할지도 몰라.",
    "생각보다 영리한 버그였어.",
    "CI가 계속 초록색이면 좋겠다.",
    "지금 회의실 쓰는 사람 있나?",
    "메일은 5분쯤 기다려도 돼.",
    "잠깐 쉬길 잘했네.",
    "최신 로그를 확인해야겠다.",
    "누가 원두를 채워 뒀나?",
    "배포는 아침까지 기다려도 되겠지.",
    "그 변수 이름을 바꿔야겠다.",
    "잠깐 스트레칭할 시간이다.",
    "캐시 무효화가 채팅방에 입장했습니다.",
    "이제 고무 오리가 시니어 개발자야.",
    "DNS였네. 언제나 DNS지.",
    "그 세미콜론은 코드 리뷰에서 살아남았어.",
    "머지 충돌이 폭력을 선택했다.",
    "내 컴퓨터에서는 되는데, 박물관에 전시할까?",
    "Vim에서는 마음대로 나갈 수 없어.",
    "커피 컴파일 중. 잠시만 기다려 주세요.",
    "로컬호스트는 내 정서적 지지 서버야.",
    "TODO가 방금 자아를 얻었어.",
    "마감이 지나니 버그가 기능이 됐네.",
    "Git blame이 과거의 나를 가리킨다.",
    "다크 모드에서는 테스트도 빨라지는 게 분명해.",
    "재귀 농담 안에 재귀 농담이 하나 있어.",
    "오류 404: 의욕을 찾을 수 없습니다.",
    "금요일 배포라고? 좋은 시도였어.",
    "키보드에 커밋보다 과자 부스러기가 많네.",
    "변수 이름 짓다가 스프린트가 끝났어.",
    "린터와 잠시 거리를 두기로 했어.",
    "프로덕션은 대가가 따르는 스테이징이야.",
    ...geekIdlePhrases.ko
  ],
  ja: [
    "コミットしたっけ？",
    "このコーヒー、いまいちだな。",
    "今日は早く帰りたい。",
    "ビルドは良さそう。出そうかな？",
    "テスト、ずいぶん長かったな。",
    "もう一杯コーヒーが必要だ。",
    "フォーマッターをかけたっけ？",
    "今日はビルドが静かだな。",
    "ブランチを整理しないと。",
    "あと一つ終えたら休もう。",
    "プリンターはなぜ起きてるんだ？",
    "今日はラウンジが妙に静かだ。",
    "何をしに来たんだっけ？",
    "ドキュメントを更新しようかな。",
    "思ったより手強いバグだった。",
    "CIがこのまま緑だといいな。",
    "会議室は誰か使ってる？",
    "メールは5分くらい待てる。",
    "少し休んでよかった。",
    "最新のログを確認しよう。",
    "誰か豆を補充してくれた？",
    "デプロイは朝まで待てるよね。",
    "あの変数名を変えないと。",
    "少しストレッチしよう。",
    "キャッシュ無効化がチャットに参加しました。",
    "ゴムのアヒルが今やシニアエンジニアだ。",
    "DNSだった。いつだってDNSだ。",
    "あのセミコロン、コードレビューを生き延びた。",
    "マージコンフリクトが暴力を選んだ。",
    "私の環境では動く。博物館に飾ろう。",
    "Vimから簡単に出られると思うな。",
    "コーヒーをコンパイル中。少々お待ちください。",
    "localhostは心の支えになるサーバーだ。",
    "TODOがついに自我を持った。",
    "締切を過ぎたらバグが仕様になった。",
    "Git blameが過去の自分を指している。",
    "ダークモードならテストも速いはず。",
    "再帰ジョークの中に再帰ジョークがある。",
    "エラー404：やる気が見つかりません。",
    "金曜にデプロイ？いい冗談だ。",
    "キーボードにはコミットより食べかすが多い。",
    "変数名を考えていたらスプリントが終わった。",
    "リンターとは少し距離を置くことにした。",
    "本番環境は代償つきのステージングだ。",
    ...geekIdlePhrases.ja
  ]
};

/** Picks an idle line randomly while excluding the actor's immediately previous line. */
export function idlePhrase(
  locale: Locale,
  previous: string | undefined,
  random: () => number = Math.random
): string {
  return randomChoiceExcept(idlePhrases[locale], previous, random);
}

export function agentSpeech(locale: Locale, agent: AgentSnapshot, idle?: string): string {
  if (agent.status === "completed") return idle ?? systemPhrase(locale, "coffee");
  if (agent.status === "waiting") return systemPhrase(locale, "waiting");
  if (agent.status === "error") return systemPhrase(locale, "error");
  return agent.lastMessage?.text ?? agent.activity?.summary ?? systemPhrase(locale, "working");
}

export function transitionSpeech(locale: Locale, type: AgentSnapshot["lastEventType"]): string {
  if (type === "agent.started") return systemPhrase(locale, "started");
  if (type === "agent.waiting") return systemPhrase(locale, "waiting");
  if (type === "agent.completed") return systemPhrase(locale, "completed");
  if (type === "agent.failed") return systemPhrase(locale, "error");
  return systemPhrase(locale, "working");
}
