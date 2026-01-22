"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

const SELECT_BASE =
  "w-full pl-2.5 pr-8 py-1.5 border border-[#e1e4ea] rounded-md text-sm text-[#0e121b] bg-white focus:outline-none focus:ring-1 focus:ring-[#335cff] focus:border-[#335cff] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors appearance-none";

/**
 * Reusable select component for dashboard forms.
 * Uses appearance-none with custom chevron icon for consistent styling.
 */
const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select ref={ref} className={cn(SELECT_BASE, className)} {...props}>
          {children}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#525866] pointer-events-none" />
      </div>
    );
  }
);

Select.displayName = "Select";

export { Select };
