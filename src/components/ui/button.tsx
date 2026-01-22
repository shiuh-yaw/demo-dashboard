"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "outline";
type ButtonSize = "default" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const BUTTON_BASE =
  "flex items-center justify-center rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-[#335cff] text-white hover:bg-[#2850e8] shadow-[0px_1px_2px_0px_rgba(10,13,20,0.03)]",
  secondary: "bg-white border border-gray-200 text-[#0e121b] hover:bg-gray-50",
  outline:
    "bg-white border border-[#e1e4ea] text-[#525866] hover:text-[#0e121b] hover:bg-[#f5f7fa]",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  default: "h-9 px-3 text-xs font-medium gap-1.5",
  icon: "w-9 h-9 p-0",
};

/**
 * Reusable button component with primary/secondary/outline variants.
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "default",
      type = "button",
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          BUTTON_BASE,
          BUTTON_VARIANTS[variant],
          BUTTON_SIZES[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button, type ButtonVariant, type ButtonSize };
