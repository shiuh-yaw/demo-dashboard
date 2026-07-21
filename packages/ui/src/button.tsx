"use client";

import {
  forwardRef,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ButtonHTMLAttributes,
} from "react";
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
  /** Render as child element (e.g. Link) instead of button, merging props */
  asChild?: boolean;
}

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none outline-none cursor-pointer [&_svg]:pointer-events-none [&_svg]:shrink-0";

/**
 * Button variants using Tailwind v4 CSS variable syntax.
 * Variables are defined in each app's globals.css with sensible defaults.
 * Primary: --widget-primary (widget apps) or --color-earn-text-primary (earn app)
 */
const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  // Text-on-primary rides --brand-primary-fg (D-030, derived per brand by
  // widgetThemeToBrandTheme) with a white fallback for apps that don't
  // import defaults.css — white matches the pre-D-030 behavior.
  primary:
    "bg-[var(--widget-primary,#335cff)] text-[var(--brand-primary-fg,#ffffff)] shadow-sm hover:opacity-90",
  default:
    "bg-[var(--widget-primary,#335cff)] text-[var(--brand-primary-fg,#ffffff)] shadow-sm hover:opacity-90",
  secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
  outline:
    "border border-[var(--widget-border,#e1e4ea)] bg-[var(--widget-bg,#ffffff)] text-[var(--widget-fg,#252731)] hover:bg-[var(--widget-row-hover,#eef1f1)] hover:text-[var(--widget-fg,#252731)]",
  ghost: "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
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
      asChild = false,
      children,
      ...props
    },
    ref,
  ) => {
    const buttonClassName = cn(
      BUTTON_BASE,
      BUTTON_VARIANTS[variant],
      BUTTON_SIZES[size],
      danger &&
        "hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 hover:border-red-200",
      loading && "animate-pulse",
      className,
    );

    if (asChild && isValidElement(children)) {
      return cloneElement(children as ReactElement<{ className?: string; ref?: React.Ref<unknown> }>, {
        ...props,
        className: cn(
          (children as ReactElement<{ className?: string }>).props.className,
          buttonClassName,
        ),
        ref,
        ...(disabled !== undefined && { "aria-disabled": disabled }),
      });
    }

    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled || loading}
        className={buttonClassName}
        {...props}
      >
        {loading ? (
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
        ) : (
          children
        )}
      </button>
    );
  },
);

Button.displayName = "Button";

export { Button };
