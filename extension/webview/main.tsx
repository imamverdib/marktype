import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { Shell } from "./Shell";
import { post } from "./bridge";
import "katex/dist/katex.min.css";
import "./theme.css";

// Webview consoles are easy to miss; surface failures in the IDE instead.
window.addEventListener("error", (event) => {
  post({
    type: "error",
    message: event.error instanceof Error ? event.error.message : event.message,
  });
});
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  post({
    type: "error",
    message: reason instanceof Error ? reason.message : String(reason),
  });
});

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root element");

createRoot(container).render(
  <StrictMode>
    <Shell />
  </StrictMode>,
);
