import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { serveStaticFile } from "./static-files.js";

describe("production static files", () => {
  it("serves the index while containing traversal", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "token-floor-web-"));
    fs.writeFileSync(path.join(root, "index.html"), "office");
    const response = fakeResponse();
    expect(serveStaticFile({ method: "HEAD", url: "/" } as never, response.value, root)).toBe(true);
    expect(response.status()).toBe(200);
    expect(
      serveStaticFile({ method: "GET", url: "/%2e%2e/secret" } as never, fakeResponse().value, root)
    ).toBe(false);
  });
});

function fakeResponse() {
  let status = 0;
  const value = {
    writeHead(code: number) {
      status = code;
      return this;
    },
    end() {}
  } as never;
  return { value, status: () => status };
}
