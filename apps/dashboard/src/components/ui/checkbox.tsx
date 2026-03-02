"use client";

import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { Check } from "lucide-react";
import { cn } from "@dynamic-demos/utils";

interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

/**
 * Reusable checkbox component for dashboard forms.
 * Custom styled checkbox with check icon.
 */
const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, checked, disabled, ...props }, ref) => {
    const generatedId = useId();
    const checkboxId = label ? id || generatedId : id;

    const checkboxElement = (
      <div className="relative inline-flex">
        <input
          ref={ref}
          id={checkboxId}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          className="peer sr-only"
          {...props}
        />
        <div
          className={cn(
            "w-4 h-4 rounded border-2 transition-colors flex items-center justify-center",
            "border-slate-300 bg-white",
            "peer-checked:bg-[#335cff] peer-checked:border-[#335cff]",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-[#335cff] peer-focus-visible:ring-offset-1",
            "peer-disabled:opacity-50 peer-disabled:cursor-not-allowed",
            className
          )}
        >
          <Check
            className={cn(
              "w-3 h-3 text-white transition-opacity",
              checked ? "opacity-100" : "opacity-0"
            )}
            strokeWidth={3}
          />
        </div>
      </div>
    );

    if (label) {
      return (
        <label
          htmlFor={checkboxId}
          className={cn(
            "flex items-start gap-2.5 cursor-pointer",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          {checkboxElement}
          <span className="text-xs text-slate-600 leading-4">{label}</span>
        </label>
      );
    }

    return checkboxElement;
  }
);

Checkbox.displayName = "Checkbox";

export { Checkbox };
