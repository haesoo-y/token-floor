import { useClaudeIntegration } from "../hooks/useClaudeIntegration.js";
import { translate, type Locale } from "../lib/i18n.js";

export function ClaudeIntegrationButton({ locale }: { locale: Locale }) {
  const integration = useClaudeIntegration();
  return (
    <button
      className={`integration-button ${integration.installed ? "installed" : ""}`}
      disabled={integration.pending}
      onClick={() => void integration.toggle()}
      title={integration.settingsPath}
    >
      <span className="integration-dot" />
      {translate(
        locale,
        integration.pending
          ? "claudeChecking"
          : integration.installed
            ? "claudeConnected"
            : "claudeConnect"
      )}
    </button>
  );
}
