import type http from "node:http";
import type { EventStore } from "./event-store.js";

/** Local projection server lifecycle exposed to CLI and integration tests. */
export interface TokenFloorServer {
  server: http.Server;
  close: () => Promise<void>;
}

/** Provider-owned read-only roots and Token Floor-owned persistence overrides. */
export interface TokenFloorServerOptions {
  claudeCliRootPath?: string;
  claudeDesktopCachePath?: string;
  claudeProjectsPath?: string;
  claudeUsagePath?: string;
  codexSessionsPath?: string;
  providerUsageCachePath?: string;
  eventStore?: EventStore;
  simulation?: boolean;
}
