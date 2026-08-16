import { useEffect, useState } from "react";
import {
  applyEvent,
  createOfficeState,
  type NormalizedEvent,
  type OfficeState
} from "@token-floor/protocol";

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
  const [events, setEvents] = useState<NormalizedEvent[]>([]);
  const [connection, setConnection] = useState<ConnectionStatus>("connecting");

  // The hook owns exactly one socket for its mounted lifetime and closes it during unmount.
  useEffect(() => {
    const url = import.meta.env.VITE_TOKEN_FLOOR_WS ?? "ws://127.0.0.1:4317/events";
    const socket = new WebSocket(url);
    socket.addEventListener("open", () => setConnection("connected"));
    socket.addEventListener("close", () => setConnection("disconnected"));
    socket.addEventListener("error", () => setConnection("disconnected"));
    socket.addEventListener("message", (message) => {
      const payload = JSON.parse(String(message.data)) as SnapshotMessage | EventMessage;
      if (payload.type === "snapshot") return setState(payload.state);
      setState((current) => applyEvent(current, payload.event));
      setEvents((current) => [payload.event, ...current].slice(0, 50));
    });
    return () => socket.close();
  }, []);

  return { state, events, connection };
}
