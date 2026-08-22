import type { ReactNode } from "react";

import { Modal } from "./Modal";
import { Button } from "./ui/Button";
import { Switch } from "./ui/Switch";
import type { FontChoice, Preferences } from "@/lib/settings";
import { cn } from "@/lib/utils";

type PreferencesSheetProps = {
  open: boolean;
  preferences: Preferences;
  onClose: () => void;
  onChange: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
};

const FONTS: { value: FontChoice; label: string }[] = [
  { value: "sans", label: "System" },
  { value: "serif", label: "Serif" },
  { value: "mono", label: "Mono" },
];

const Row = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) => (
  <div className="flex items-center justify-between gap-4 py-2">
    <div className="min-w-0">
      <p className="text-[13px] text-ink">{label}</p>
      {hint && <p className="text-[11px] text-ink-faint">{hint}</p>}
    </div>
    {children}
  </div>
);

/** Appearance and writing-mode preferences (⌘,). */
export function PreferencesSheet({
  open,
  preferences,
  onClose,
  onChange,
}: PreferencesSheetProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Preferences"
      description="Stored locally; they apply to every document you open."
      footer={
        <Button variant="outline" size="sm" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="divide-y divide-edge">
        <Row label="Theme">
          <div className="flex overflow-hidden rounded-lg border border-edge">
            {(["light", "dark"] as const).map((theme) => (
              <button
                key={theme}
                type="button"
                onClick={() => onChange("theme", theme)}
                className={cn(
                  "no-drag px-3 py-1 text-[12px] capitalize transition-colors",
                  preferences.theme === theme
                    ? "bg-accent text-white"
                    : "text-ink-muted hover:bg-panel-strong",
                )}
              >
                {theme}
              </button>
            ))}
          </div>
        </Row>

        <Row label="Editor font">
          <div className="flex overflow-hidden rounded-lg border border-edge">
            {FONTS.map((font) => (
              <button
                key={font.value}
                type="button"
                onClick={() => onChange("fontFamily", font.value)}
                className={cn(
                  "no-drag px-3 py-1 text-[12px] transition-colors",
                  preferences.fontFamily === font.value
                    ? "bg-accent text-white"
                    : "text-ink-muted hover:bg-panel-strong",
                )}
              >
                {font.label}
              </button>
            ))}
          </div>
        </Row>

        <Row label="Font size" hint={`${preferences.fontSize} px`}>
          <input
            type="range"
            min={12}
            max={26}
            step={1}
            value={preferences.fontSize}
            onChange={(event) => onChange("fontSize", Number(event.target.value))}
            className="no-drag w-36 accent-[color:var(--mt-accent)]"
          />
        </Row>

        <Row label="Line width" hint={`${preferences.measure} rem`}>
          <input
            type="range"
            min={32}
            max={76}
            step={1}
            value={preferences.measure}
            onChange={(event) => onChange("measure", Number(event.target.value))}
            className="no-drag w-36 accent-[color:var(--mt-accent)]"
          />
        </Row>

        <Row label="Auto-save" hint="Writes to disk shortly after you stop typing.">
          <Switch
            checked={preferences.autosave}
            onCheckedChange={(value) => onChange("autosave", value)}
            label="Auto-save"
          />
        </Row>

        <Row label="Typewriter mode" hint="Keeps the caret at a fixed height.">
          <Switch
            checked={preferences.typewriter}
            onCheckedChange={(value) => onChange("typewriter", value)}
            label="Typewriter mode"
          />
        </Row>

        <Row label="Focus mode" hint="Dims every block except the one you are in.">
          <Switch
            checked={preferences.focusMode}
            onCheckedChange={(value) => onChange("focusMode", value)}
            label="Focus mode"
          />
        </Row>

        <Row label="Spell check">
          <Switch
            checked={preferences.spellcheck}
            onCheckedChange={(value) => onChange("spellcheck", value)}
            label="Spell check"
          />
        </Row>
      </div>
    </Modal>
  );
}
