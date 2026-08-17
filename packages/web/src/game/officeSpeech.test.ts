import { describe, expect, it } from "vitest";
import {
  agentSpeech,
  idlePhrase,
  scheduledSpeaker,
  systemPhrase,
  transitionSpeech
} from "./officeSpeech.js";

describe("office speech", () => {
  it("rotates one lounge speaker at a time", () => {
    expect(scheduledSpeaker(["a", "b", "c"], 0)).toBe("a");
    expect(scheduledSpeaker(["a", "b", "c"], 9999)).toBe("a");
    expect(scheduledSpeaker(["a", "b", "c"], 10000)).toBe("b");
    expect(scheduledSpeaker(["a", "b", "c"], 20000)).toBe("c");
  });

  it("uses random draws in every locale", () => {
    expect(idlePhrase("en", undefined, () => 0)).toBe("Did I commit that?");
    expect(idlePhrase("ko", undefined, () => 24 / 64)).toBe("캐시 무효화가 채팅방에 입장했습니다.");
    expect(idlePhrase("ja", undefined, () => 0.999)).toBe(
      "バグ報告には『時々』とある。最高の単体テストだ。"
    );
    const englishLines = Array.from({ length: 64 }, (_, index) =>
      idlePhrase("en", undefined, () => index / 64)
    );
    expect(new Set(englishLines).size).toBe(64);
  });

  it("does not repeat an actor's immediately previous line", () => {
    const previous = "Did I commit that?";
    expect(idlePhrase("en", previous, () => 0)).toBe("This coffee could be better.");
    expect(idlePhrase("en", previous, () => 0.999)).not.toBe(previous);
  });

  it("localizes owned system states", () => {
    expect(systemPhrase("ko", "waiting")).toBe("권한 확인이 필요해요");
    expect(agentSpeech("ja", { status: "error" } as never)).toBe("タスクに失敗しました");
  });

  it.each([
    ["agent.started", "Starting now"],
    ["agent.active", "Working"],
    ["agent.waiting", "Permission needed"],
    ["agent.completed", "Task complete"],
    ["agent.failed", "Task failed"]
  ] as const)("maps %s to a short transition phrase", (type, phrase) => {
    expect(transitionSpeech("en", type)).toBe(phrase);
  });
});
