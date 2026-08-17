import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import "./styles/base.css";
import "./styles/stage.css";
import "./styles/usage.css";
import "./styles/panels.css";
import "./styles/panel-controls.css";
import "./styles/character.css";
import "./styles/settings.css";

createRoot(document.getElementById("root")!).render(<App />);
