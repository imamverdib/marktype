import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type Variant = "ghost" | "solid" | "subtle" | "outline" | "danger";
type Size = "sm" | "md" | "icon" | "icon-sm";

const VARIANTS: Record<Variant, string> = {
  ghost: "text-ink-muted hover:bg-panel-strong hover:text-ink-strong",
  subtle: "bg-panel-strong text-ink hover:bg-edge/60",
  solid: "bg-accent text-white hover:brightness-110 shadow-sm",
  outline: "border border-edge text-ink hover:bg-panel-strong",
  danger: "text-[color:var(--mt-danger)] hover:bg-[color:var(--mt-danger)]/10",
};

const SIZES: Record<Size, string> = {
  sm: "h-7 gap-1.5 rounded-md px-2 text-xs",
  md: "h-8 gap-2 rounded-lg px-3 text-[13px]",
  icon: "size-8 rounded-lg",
  "icon-sm": "size-7 rounded-md",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  active?: boolean;
};

/** shadcn/ui-flavoured button, trimmed to the variants this app uses. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "ghost", size = "md", active = false, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      data-active={active || undefined}
      className={cn(
        "no-drag inline-flex shrink-0 items-center justify-center font-medium",
        "transition-colors duration-100 select-none",
        "disabled:pointer-events-none disabled:opacity-40",
        VARIANTS[variant],
        SIZES[size],
        active && "bg-accent-soft text-accent hover:bg-accent-soft hover:text-accent",
        className,
      )}
      {...props}
    />
  );
});
