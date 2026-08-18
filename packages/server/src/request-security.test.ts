import type { IncomingMessage } from "node:http";
import { describe, expect, it } from "vitest";
import {
  hasJsonContentType,
  hasLoopbackHost,
  isTrustedHookRequest,
  trustedBrowserOrigin
} from "./request-security.js";

function request(headers: IncomingMessage["headers"]): IncomingMessage {
  return { headers } as IncomingMessage;
}

describe("loopback request security", () => {
  it("accepts only the numeric loopback host and configured browser origin", () => {
    const local = request({ host: "127.0.0.1:10214", origin: "http://127.0.0.1:5173" });
    expect(hasLoopbackHost(local)).toBe(true);
    expect(trustedBrowserOrigin(local, "http://127.0.0.1:5173")).toBe("http://127.0.0.1:5173");
    expect(hasLoopbackHost(request({ host: "attacker.example" }))).toBe(false);
    expect(trustedBrowserOrigin(local, "http://127.0.0.1:8080")).toBeUndefined();
  });

  it("requires JSON and the Token Floor observer header for originless hooks", () => {
    const hook = request({
      host: "127.0.0.1:10214",
      "content-type": "application/json; charset=utf-8",
      "x-token-floor-hook": "token-floor-observer-v1"
    });
    expect(hasJsonContentType(hook)).toBe(true);
    expect(isTrustedHookRequest(hook)).toBe(true);
    expect(
      isTrustedHookRequest(request({ ...hook.headers, origin: "https://attacker.example" }))
    ).toBe(false);
    expect(
      isTrustedHookRequest(request({ ...hook.headers, "x-token-floor-hook": undefined }))
    ).toBe(false);
  });
});
