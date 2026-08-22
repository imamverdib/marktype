import { cn } from "@/lib/utils";

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
};

/** Compact macOS-style toggle; the whole row is the hit target. */
export function Switch({ checked, onCheckedChange, label, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "no-drag relative inline-flex h-[18px] w-[30px] shrink-0 items-center rounded-full",
        "transition-colors duration-150 disabled:opacity-40",
        checked ? "bg-accent" : "bg-edge-strong",
      )}
    >
      <span
        className={cn(
          "size-[14px] rounded-full bg-white shadow-sm transition-transform duration-150",
          checked ? "translate-x-[14px]" : "translate-x-[2px]",
        )}
      />
    </button>
  );
}
