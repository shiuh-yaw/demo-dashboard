"use client";

/**
 * Circular icon-only button for a widget toolbar.
 *
 * Geometry matches `CopyButton` at `size="md"` with `className="rounded-full"`
 * (p-2, ~14px icon), because the two sit next to each other in every toolbar
 * that uses this and a half-pixel difference in a row of four reads as
 * misalignment. Both apps had hand-rolled this; keeping one definition is the
 * point.
 *
 * `label` is required - the button has no text, so without it the control is
 * unnameable to a screen reader. It doubles as the tooltip unless
 * `showTooltip` is off.
 */

import type { ReactNode } from "react";
import { cn } from "@dynamic-demos/utils";
import { Tooltip } from "./tooltip";

export interface IconButtonProps {
  children: ReactNode;
  /** Accessible name, and the tooltip text. */
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  showTooltip?: boolean;
  className?: string;
  type?: "button" | "submit";
}

export function IconButton({
  children,
  label,
  onClick,
  disabled,
  showTooltip = true,
  className,
  type = "button",
}: IconButtonProps) {
  const button = (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "cursor-pointer rounded-full p-2 transition-all duration-150 ease-out",
        "text-(--brand-muted) hover:bg-black/5 hover:text-(--brand-fg) hover:scale-110",
        "active:scale-95",
        "disabled:cursor-default disabled:opacity-50 disabled:hover:scale-100 disabled:hover:bg-transparent",
        "outline-none focus-visible:ring-1 focus-visible:ring-(--brand-primary)",
        className,
      )}
    >
      {children}
    </button>
  );

  if (!showTooltip) return button;
  return <Tooltip content={label}>{button}</Tooltip>;
}
