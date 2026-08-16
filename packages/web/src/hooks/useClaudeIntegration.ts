import { useEffect, useState } from "react";

interface ClaudeIntegrationState {
  installed: boolean;
  settingsPath?: string;
  pending: boolean;
}

const endpoint = "http://127.0.0.1:4317/integrations/claude";

/** Loads and updates the consent-driven Claude Code hook installation state. */
export function useClaudeIntegration() {
  const [state, setState] = useState<ClaudeIntegrationState>({ installed: false, pending: true });

  // Integration state lives in Claude's settings file, so it must be read from the local server.
  useEffect(() => {
    let active = true;
    void fetch(endpoint)
      .then((response) => response.json() as Promise<Omit<ClaudeIntegrationState, "pending">>)
      .then((status) => active && setState({ ...status, pending: false }))
      .catch(() => active && setState({ installed: false, pending: false }));
    return () => {
      active = false;
    };
  }, []);

  const toggle = async () => {
    setState((current) => ({ ...current, pending: true }));
    try {
      const response = await fetch(endpoint, { method: state.installed ? "DELETE" : "POST" });
      if (!response.ok) throw new Error("Claude integration update failed");
      const status = (await response.json()) as Omit<ClaudeIntegrationState, "pending">;
      setState({ ...status, pending: false });
    } catch {
      setState((current) => ({ ...current, pending: false }));
    }
  };
  return { ...state, toggle };
}
