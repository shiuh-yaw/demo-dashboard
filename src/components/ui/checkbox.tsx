"use client";

import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

const CHECKBOX_BASE =
  "w-3.5 h-3.5 text-[#335cff] rounded border-[#e1e4ea] focus:ring-[#335cff] focus:ring-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

/**
 * Reusable checkbox component for dashboard forms.
 */
const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const generatedId = useId();
    const checkboxId = label ? id || generatedId : id;

    if (label) {
      return (
        <label
          htmlFor={checkboxId}
          className="flex items-center gap-2 cursor-pointer"
        >
          <input
            ref={ref}
            id={checkboxId}
            type="checkbox"
            className={cn(CHECKBOX_BASE, className)}
            {...props}
          />
          <span className="text-xs text-[#525866]">{label}</span>
        </label>
      );
    }

    return (
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className={cn(CHECKBOX_BASE, className)}
        {...props}
      />
    );
  }
);

Checkbox.displayName = "Checkbox";

export { Checkbox };
