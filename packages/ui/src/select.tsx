"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@dynamic-demos/utils";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

/**
 * Reusable select component with CSS variable theming.
 * Uses appearance-none with custom chevron icon for consistent styling.
 */
const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            "w-full pl-2.5 pr-8 py-1.5 rounded-md text-sm bg-white cursor-pointer transition-colors appearance-none",
            "border border-[var(--widget-border,#e1e4ea)]",
            "text-slate-900",
            "focus:outline-none focus:ring-1",
            "focus:ring-[var(--widget-primary,#335cff)]",
            "focus:border-[var(--widget-primary,#335cff)]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
      </div>
    );
  }
);

Select.displayName = "Select";

export { Select };
