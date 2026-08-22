import { invoke } from "@tauri-apps/api/core";

/**
 * Forwards uncaught errors to the Rust side, which prints them in the terminal
 * running `tauri dev`. WKWebView's console is otherwise invisible from there.
 */
export function reportUncaughtErrors() {
  if (!import.meta.env.DEV) return;

  const send = (message: string, source?: string) => {
    void invoke("log_frontend_error", { message, source }).catch(() => undefined);
  };

  window.addEventListener("error", (event) => {
    const detail = event.error instanceof Error ? event.error.stack : event.message;
    send(detail ?? "Unknown error", `${event.filename}:${event.lineno}`);
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    send(
      reason instanceof Error ? (reason.stack ?? reason.message) : String(reason),
      "unhandled promise rejection",
    );
  });
}
