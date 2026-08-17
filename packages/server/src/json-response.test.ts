import type { ServerResponse } from "node:http";
import { describe, expect, it, vi } from "vitest";
import { sendCorsPreflight } from "./json-response.js";

describe("sendCorsPreflight", () => {
  it("allows local memo mutations from the Vite application", () => {
    const response = {
      writeHead: vi.fn().mockReturnThis(),
      end: vi.fn()
    } as unknown as ServerResponse;

    sendCorsPreflight(response);

    expect(response.writeHead).toHaveBeenCalledWith(
      204,
      expect.objectContaining({
        "Access-Control-Allow-Origin": "http://127.0.0.1:5173",
        "Access-Control-Allow-Methods": expect.stringContaining("PATCH"),
        "Access-Control-Allow-Headers": "Content-Type"
      })
    );
    expect(response.end).toHaveBeenCalledOnce();
  });
});
