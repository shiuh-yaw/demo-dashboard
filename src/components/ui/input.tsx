"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Use monospace font for addresses, codes, etc. */
  mono?: boolean;
}

const INPUT_BASE =
  "w-full px-2.5 py-1.5 border border-[#e1e4ea] rounded-md text-sm text-[#0e121b] placeholder:text-[#99a0ae] focus:outline-none focus:ring-1 focus:ring-[#335cff] focus:border-[#335cff] disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

/**
 * Reusable input component for dashboard forms.
 */
const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, mono, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(INPUT_BASE, mono && "font-mono text-xs", className)}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };
