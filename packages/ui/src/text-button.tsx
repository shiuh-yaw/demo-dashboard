"use client";

/**
 * A small, bare text action - the quiet third option next to a primary button
 * and a secondary one.
 *
 * For the things that sit beside content rather than under it: "3 hidden",
 * "Balance: 12.4", "Back to asset list". Every app had been hand-rolling this
 * as a bare `<button>` with the same four classes and, usually, no focus ring
 * and no cursor.
 *
 * Not a `Button` variant: `Button` is a control with a box, a height and
 * padding, and every one of these needs to sit flush against text at whatever
 * size its neighbour is.
 */

import type { ReactNode } from "react";
import { cn } from "@dynamic-demos/utils";

export interface TextButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  /** Rendered before the label - usually a 3.5-unit lucide icon. */
  icon?: ReactNode;
  /** Reflects a two-state toggle to assistive tech. */
  pressed?: boolean;
  /** Accessible name, when the visible label is not one. */
  "aria-label"?: string;
  className?: string;
  type?: "button" | "submit";
}

export function TextButton({
  children,
  onClick,
  disabled,
  icon,
  pressed,
  className,
  type = "button",
  "aria-label": ariaLabel,
}: TextButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      aria-label={ariaLabel}
      className={cn(
        "flex shrink-0 cursor-pointer items-center gap-1.5 rounded px-1 py-0.5",
        "text-(--brand-muted) transition-colors duration-150 ease-out",
        "hover:text-(--brand-fg)",
        "outline-none focus-visible:ring-1 focus-visible:ring-(--brand-primary)",
        "disabled:cursor-default disabled:opacity-60 disabled:hover:text-(--brand-muted)",
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
}
