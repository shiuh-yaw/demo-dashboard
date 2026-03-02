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
}

/**
 * Form input component with optional label and error display.
 * Uses CSS variables for theming.
 */
const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, helperText, id, mono = false, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || (label ? `input-${generatedId}` : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-slate-900"
          >
            {label}
          </label>
        )}
        <input
          type={type}
          id={inputId}
          className={cn(
            "flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900",
            "border-[var(--widget-border,#e1e4ea)]",
            "outline-none",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium",
            "placeholder:text-slate-400",
            "focus:border-[var(--widget-primary,#335cff)]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500 focus:border-red-500",
            mono && "font-mono",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-slate-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
