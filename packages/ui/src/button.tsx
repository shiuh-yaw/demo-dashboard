"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@dynamic-demos/utils";
import { Spinner } from "./spinner";

export type ButtonVariant =
  | "primary"
  | "default" // alias for primary
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "link";
export type ButtonSize = "default" | "sm" | "lg" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Show loading spinner and disable button */
  loading?: boolean;
  /** Show red/danger hover state (for destructive actions like logout) */
  danger?: boolean;
}

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 outline-none cursor-pointer";

/**
 * Button variants using Tailwind v4 CSS variable syntax.
 * Variables are defined in each app's globals.css with sensible defaults.
 * Primary: --widget-primary (widget apps) or --color-earn-text-primary (earn app)
 */
const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--widget-primary,#335cff)] text-white shadow-sm hover:opacity-90",
  default:
    "bg-[var(--widget-primary,#335cff)] text-white shadow-sm hover:opacity-90",
  secondary:
    "bg-slate-100 text-slate-900 hover:bg-slate-200",
  outline:
    "border border-[var(--widget-border,#e1e4ea)] bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900",
  ghost:
    "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
  destructive: "bg-red-600 text-white shadow-sm hover:bg-red-700",
  link: "text-[var(--widget-primary,#335cff)] underline-offset-4 hover:underline",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  default: "h-9 px-4 py-2",
  sm: "h-8 rounded-lg gap-1.5 px-3 text-xs",
  lg: "h-10 rounded-lg px-6",
  icon: "h-9 w-9 p-0",
};

/**
 * Reusable button component with multiple variants.
 * Uses CSS variables for theming - works with both widget and dashboard themes.
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "default",
      loading = false,
      danger = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled || loading}
        className={cn(
          BUTTON_BASE,
          BUTTON_VARIANTS[variant],
          BUTTON_SIZES[size],
          // Danger hover state (for destructive actions)
          danger &&
            "hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 hover:border-red-200",
          loading && "animate-pulse",
          className
        )}
        {...props}
      >
        {loading && (
          <Spinner
            size="sm"
            className={
              variant === "primary" ||
              variant === "default" ||
              variant === "destructive"
                ? "border-white/30 border-t-white"
                : undefined
            }
          />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
