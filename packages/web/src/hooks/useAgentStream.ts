import { useEffect, useState } from "react";
import {
  applyEvent,
  createOfficeState,
  type NormalizedEvent,
  type OfficeState
} from "@token-floor/protocol";
import { reconnectDelay } from "./connectionRetry.js";

type ConnectionStatus = "connecting" | "connected" | "disconnected";

interface SnapshotMessage {
  type: "snapshot";
  state: OfficeState;
}

interface EventMessage {
  type: "event";
  event: NormalizedEvent;
}

/**
 * Owns the live event connection and projects snapshot plus incremental events into UI state.
 */
export function useAgentStream(): {
  state: OfficeState;
  events: NormalizedEvent[];
  connection: ConnectionStatus;
} {
  const [state, setState] = useState(createOfficeState);
  const [connection, setConnection] = useState<ConnectionStatus>("connecting");

  // This effect owns one sequential WebSocket lifecycle, its retry timer, and final cleanup.
  useEffect(() => {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const url = import.meta.env.VITE_TOKEN_FLOOR_WS ?? `${protocol}//${location.host}/events`;
    let socket: WebSocket | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let active = true;
    const connect = () => {
      if (!active) return;
      setConnection("connecting");
      const current = new WebSocket(url);
      socket = current;
      current.addEventListener("open", () => {
        attempt = 0;
        setConnection("connected");
      });
      current.addEventListener("close", () => {
        if (!active) return;
        setConnection("disconnected");
        retryTimer = setTimeout(connect, reconnectDelay(attempt++));
      });
      current.addEventListener("error", () => current.close());
      current.addEventListener("message", (message) => {
        try {
          const payload = JSON.parse(String(message.data)) as SnapshotMessage | EventMessage;
          if (payload.type === "snapshot") {
            return setState({
              ...payload.state,
              sourceStatusByProvider: payload.state.sourceStatusByProvider ?? {}
            });
          }
          setState((current) => applyEvent(current, payload.event));
        } catch {
          // A malformed frame is isolated; the live socket can still deliver its next snapshot.
        }
      });
    };
    connect();
    return () => {
      active = false;
      if (retryTimer) clearTimeout(retryTimer);
      socket?.close();
    };
  }, []);

  return { state, events: state.recentEvents ?? [], connection };
}
