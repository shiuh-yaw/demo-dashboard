"use client";

/**
 * Overflow menu for a row's secondary actions.
 *
 * Exists so a dense row can carry one clear primary action plus everything
 * else, instead of a line of same-weight icons where nothing tells you which
 * controls belong together.
 *
 * Radix under the hood (as `Dialog` already is) for focus trapping, typeahead,
 * arrow-key navigation and the escape/outside-press behaviour - all of which is
 * easy to get subtly wrong by hand. Styling rides the `--widget-*` contract, so
 * a prospect theme restyles it.
 */

import { type ReactNode } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@dynamic-demos/utils";

export interface MenuProps {
  /** Accessible name for the trigger, e.g. "Wallet actions". */
  label: string;
  children: ReactNode;
  /** Which trigger edge the panel lines up with. Default `end`. */
  align?: "start" | "end";
  disabled?: boolean;
  /** Replaces the default `⋯` trigger. */
  trigger?: ReactNode;
  className?: string;
}

export function Menu({
  label,
  children,
  align = "end",
  disabled = false,
  trigger,
  className,
}: MenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild disabled={disabled}>
        {trigger ?? (
          <button
            type="button"
            aria-label={label}
            className={cn(
              "inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors",
              "text-[var(--widget-muted,#64748b)]",
              "hover:bg-[var(--widget-row-hover,#eef1f1)] hover:text-[var(--widget-fg,#252731)]",
              "outline-none focus-visible:ring-1 focus-visible:ring-[var(--widget-primary,#335cff)]",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "data-[state=open]:bg-[var(--widget-row-hover,#eef1f1)]",
              className,
            )}
          >
            <MoreHorizontal className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
        )}
      </DropdownMenu.Trigger>

      {/* Portalled so a row inside an `overflow-y-auto` list cannot clip it. */}
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={4}
          className={cn(
            "z-[9999] min-w-[168px] overflow-hidden p-1",
            "rounded-lg border border-[var(--widget-border,#e1e4ea)]",
            "bg-[var(--widget-bg,#ffffff)] shadow-lg",
          )}
        >
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export interface MenuItemProps {
  children: ReactNode;
  onSelect: () => void;
  /** Leading icon, sized by the caller (h-3.5 w-3.5 suits this row height). */
  icon?: ReactNode;
  /**
   * Destructive. Red at rest, not only on hover: an action that cannot be
   * undone should look like one before the pointer is over it.
   */
  danger?: boolean;
  disabled?: boolean;
}

export function MenuItem({
  children,
  onSelect,
  icon,
  danger = false,
  disabled = false,
}: MenuItemProps) {
  return (
    <DropdownMenu.Item
      disabled={disabled}
      onSelect={() => onSelect()}
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none",
        danger
          ? "text-red-600 data-[highlighted]:bg-red-50"
          : "text-[var(--widget-fg,#252731)] data-[highlighted]:bg-[var(--widget-row-hover,#eef1f1)]",
        "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
      )}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </DropdownMenu.Item>
  );
}

/** Hairline between groups of items. */
export function MenuSeparator() {
  return (
    <DropdownMenu.Separator className="my-1 h-px bg-[var(--widget-border,#e1e4ea)]" />
  );
}
