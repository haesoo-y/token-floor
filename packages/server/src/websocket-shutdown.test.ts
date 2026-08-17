import { describe, expect, it, vi } from "vitest";
import { terminateWebSocketClients } from "./websocket-shutdown.js";

describe("terminateWebSocketClients", () => {
  it("terminates every active client during server shutdown", () => {
    const clients = [{ terminate: vi.fn() }, { terminate: vi.fn() }];
    terminateWebSocketClients(clients);
    expect(clients.every((client) => client.terminate.mock.calls.length === 1)).toBe(true);
  });
});
