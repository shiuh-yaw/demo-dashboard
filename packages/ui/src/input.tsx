"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@dynamic-demos/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Optional label */
  label?: ReactNode;
  /** Error message */
  error?: string;
  /** Helper text */
  helperText?: string;
  /** Use monospace font for the input */
  mono?: boolean;
  /**
   * Keep password managers out of this field.
   *
   * Opt-in rather than the default, because the same component renders real
   * email and password fields where autofill is the point. Turn it on for
   * anything a vault would only ever fill wrongly - a blockchain address, an
   * amount, a token contract - where the offer to fill "Eric Tesenair" into a
   * recipient field is at best noise and at worst a mis-send.
   *
   * Four attributes because each manager reads its own: 1Password, LastPass,
   * Dashlane, and the browser's own heuristic.
   */
  noAutofill?: boolean;
}

/**
 * Form input component with optional label and error display.
 * Uses CSS variables for theming.
 */
const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      label,
      error,
      helperText,
      id,
      mono = false,
      noAutofill = false,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = id || (label ? `input-${generatedId}` : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-[var(--widget-fg,#1e293b)]"
          >
            {label}
          </label>
        )}
        <input
          type={type}
          id={inputId}
          className={cn(
            "flex h-10 w-full rounded-lg border px-3 py-2 text-sm",
            "bg-[var(--widget-bg,#ffffff)] text-[var(--widget-fg,#1e293b)]",
            "border-[var(--widget-border,#e1e4ea)]",
            "outline-none",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium",
            "placeholder:text-[var(--widget-muted,#9ca3af)]",
            "focus:border-[var(--widget-primary,#335cff)]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500 focus:border-red-500",
            mono && "font-mono",
            className
          )}
          ref={ref}
          {...(noAutofill && {
            autoComplete: "off",
            "data-1p-ignore": "true",
            "data-lpignore": "true",
            "data-form-type": "other",
          })}
          {...props}
        />
        {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
        {helperText && !error && (
          <p className="mt-1.5 text-xs leading-relaxed text-[var(--widget-muted,#64748b)]">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
