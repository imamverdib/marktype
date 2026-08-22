import * as Radix from "@radix-ui/react-dropdown-menu";
import { Check } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export const DropdownMenu = Radix.Root;
export const DropdownMenuTrigger = Radix.Trigger;

export function DropdownMenuContent({
  className,
  align = "end",
  sideOffset = 6,
  ...props
}: ComponentProps<typeof Radix.Content>) {
  return (
    <Radix.Portal>
      <Radix.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-52 overflow-hidden rounded-xl border border-edge bg-panel p-1",
          "shadow-float select-none",
          className,
        )}
        {...props}
      />
    </Radix.Portal>
  );
}

export function DropdownMenuItem({
  className,
  inset,
  ...props
}: ComponentProps<typeof Radix.Item> & { inset?: boolean }) {
  return (
    <Radix.Item
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] text-ink outline-none",
        "data-[highlighted]:bg-accent-soft data-[highlighted]:text-accent",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
        inset && "pl-7",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: ComponentProps<typeof Radix.CheckboxItem>) {
  return (
    <Radix.CheckboxItem
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-lg py-1.5 pr-2 pl-7 text-[13px] text-ink outline-none",
        "relative data-[highlighted]:bg-accent-soft data-[highlighted]:text-accent",
        className,
      )}
      {...props}
    >
      <Radix.ItemIndicator className="absolute left-1.5">
        <Check className="size-3.5" />
      </Radix.ItemIndicator>
      {children}
    </Radix.CheckboxItem>
  );
}

export const DropdownMenuLabel = ({
  className,
  ...props
}: ComponentProps<typeof Radix.Label>) => (
  <Radix.Label
    className={cn(
      "px-2 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-ink-faint uppercase",
      className,
    )}
    {...props}
  />
);

export const DropdownMenuSeparator = ({
  className,
  ...props
}: ComponentProps<typeof Radix.Separator>) => (
  <Radix.Separator className={cn("my-1 h-px bg-edge", className)} {...props} />
);

export const DropdownMenuShortcut = ({
  className,
  ...props
}: ComponentProps<"span">) => (
  <span
    className={cn("ml-auto font-mono text-[10px] text-ink-faint", className)}
    {...props}
  />
);
