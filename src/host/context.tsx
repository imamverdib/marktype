import { createContext, useContext, type ReactNode } from "react";

import type { HostAdapter } from "./types";

const HostContext = createContext<HostAdapter | null>(null);

export function HostProvider({
  adapter,
  children,
}: {
  adapter: HostAdapter;
  children: ReactNode;
}) {
  return <HostContext.Provider value={adapter}>{children}</HostContext.Provider>;
}

export function useHost(): HostAdapter {
  const adapter = useContext(HostContext);
  if (!adapter) throw new Error("useHost must be used inside a HostProvider");
  return adapter;
}
