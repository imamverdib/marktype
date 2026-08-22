import { useCallback, useEffect, useState } from "react";

import {
  applyPreferences,
  loadPreferences,
  savePreferences,
  type Preferences,
} from "@/lib/settings";

type BooleanKey = {
  [K in keyof Preferences]: Preferences[K] extends boolean ? K : never;
}[keyof Preferences];

/** Preferences, mirrored onto the document root and into localStorage. */
export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences>(loadPreferences);

  useEffect(() => {
    applyPreferences(preferences);
    savePreferences(preferences);
  }, [preferences]);

  const set = useCallback(
    <K extends keyof Preferences>(key: K, value: Preferences[K]) =>
      setPreferences((current) => ({ ...current, [key]: value })),
    [],
  );

  const toggle = useCallback(
    (key: BooleanKey) =>
      setPreferences((current) => ({ ...current, [key]: !current[key] })),
    [],
  );

  return { preferences, set, toggle };
}
