import type { AddressInfo } from "node:net";
import { loopbackUrl } from "@token-floor/protocol";
import { createTokenFloorServer } from "./app-server.js";
import { SqliteEventStore } from "./event-store.js";
import { resolveProviderPaths, resolveRuntimePaths } from "./runtime-paths.js";

export interface StartTokenFloorOptions {
  port: number;
  cwd?: string;
  home?: string;
  webRootPath?: string;
  simulation?: boolean;
  browserOrigin?: string;
}

/** Starts the complete local collector, HTTP API, WebSocket, and production UI on one port. */
export async function startTokenFloor(options: StartTokenFloorOptions) {
  const runtime = resolveRuntimePaths(options.cwd);
  const provider = resolveProviderPaths(options.home);
  const browserOrigin = options.browserOrigin ?? loopbackUrl(options.port);
  const app = createTokenFloorServer({
    browserOrigin,
    claudeCliRootPath: provider.claudeRoot,
    claudeDesktopCachePath: provider.claudeDesktopCache,
    claudeProjectsPath: provider.claudeProjects,
    claudeUsagePath: provider.claudeUsage,
    codexSessionsPath: provider.codexSessions,
    memosPath: runtime.memos,
    providerUsageCachePath: runtime.usage,
    eventStore: new SqliteEventStore(runtime.database),
    simulation: options.simulation ?? false,
    ...(options.webRootPath ? { webRootPath: options.webRootPath } : {})
  });
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => reject(error);
    app.server.once("error", onError);
    app.server.listen(options.port, "127.0.0.1", () => {
      app.server.off("error", onError);
      resolve();
    });
  }).catch(async (error) => {
    await app.close();
    throw error;
  });
  const address = app.server.address() as AddressInfo;
  return { ...app, port: address.port, url: loopbackUrl(address.port), runtime };
}
