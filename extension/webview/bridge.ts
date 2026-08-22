import type { HostMessage, WebviewMessage } from "../src/protocol";

type VsCodeApi = {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};

declare function acquireVsCodeApi(): VsCodeApi;

const api = acquireVsCodeApi();

export function post(message: WebviewMessage) {
  api.postMessage(message);
}

/** Pending `saveImage`/`pickImage` round-trips, keyed by request id. */
const pending = new Map<number, (src: string | null) => void>();
let nextId = 0;

/** Sends a request that the host answers with a `reply`. */
export function request(make: (id: number) => WebviewMessage): Promise<string | null> {
  const id = (nextId += 1);
  return new Promise((resolve) => {
    pending.set(id, resolve);
    post(make(id));
  });
}

/**
 * Subscribes to host messages. Replies are resolved here rather than being
 * handed to the caller, so request/response stays inside the bridge.
 */
export function onHostMessage(handler: (message: HostMessage) => void) {
  const listener = (event: MessageEvent<HostMessage>) => {
    const message = event.data;
    if (!message || typeof message !== "object") return;

    if (message.type === "reply") {
      const resolve = pending.get(message.id);
      pending.delete(message.id);
      resolve?.(message.src);
      return;
    }
    handler(message);
  };

  window.addEventListener("message", listener);
  return () => window.removeEventListener("message", listener);
}
