import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import { reportUncaughtErrors } from "./lib/diagnostics";
import { setDocumentDir } from "./lib/tauriAssets";
import "katex/dist/katex.min.css";
import "./styles/index.css";
import "./styles/editor.css";

reportUncaughtErrors();
// Install desktop asset resolution before the first render; opening a document
// re-points it at that document's folder.
setDocumentDir(null);

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root element");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
