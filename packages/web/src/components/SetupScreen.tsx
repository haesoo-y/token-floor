import { translate, type Locale } from "../lib/i18n.js";

export function SetupScreen({ files, locale }: { files: string[]; locale: Locale }) {
  return (
    <section className="setup-screen">
      <span className="setup-icon">32</span>
      <div>
        <p className="kicker">ASSET CHECK</p>
        <h2>{translate(locale, "assetTitle")}</h2>
        <p>{translate(locale, "assetBody")}</p>
        <code>packages/web/public/vendor/metrocity/</code>
        <details>
          <summary>Missing files</summary>
          <ul>
            {files.map((file) => (
              <li key={file}>{decodeURIComponent(file)}</li>
            ))}
          </ul>
        </details>
      </div>
    </section>
  );
}
