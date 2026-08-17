interface TerminableSocket {
  terminate: () => void;
}

/** Ends active clients so shutdown is immediately observable and cannot hang on open sockets. */
export function terminateWebSocketClients(clients: Iterable<TerminableSocket>): void {
  for (const socket of clients) socket.terminate();
}
