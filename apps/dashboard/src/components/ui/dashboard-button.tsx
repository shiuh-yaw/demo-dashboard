"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import Link from "next/link";
import { cn } from "@dynamic-demos/utils";

type DashboardButtonVariant = "primary" | "outline" | "ghost" | "warning";
type DashboardButtonSize = "sm" | "md" | "icon";

interface DashboardButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: DashboardButtonVariant;
  size?: DashboardButtonSize;
}

interface DashboardLinkButtonProps {
  href: string;
  target?: string;
  variant?: DashboardButtonVariant;
  size?: DashboardButtonSize;
  disabled?: boolean;
  title?: string;
  className?: string;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
}

const BUTTON_BASE =
  "inline-flex items-center justify-center font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

const BUTTON_VARIANTS: Record<DashboardButtonVariant, string> = {
  primary:
    "bg-[#335cff] hover:bg-[#2850e8] text-white shadow-[0px_1px_2px_0px_rgba(10,13,20,0.03)]",
  warning:
    "bg-[#f59e0b] hover:bg-[#d97706] text-white shadow-[0px_1px_2px_0px_rgba(10,13,20,0.03)]",
  outline:
    "bg-white border border-[#e1e4ea] text-[#525866] hover:text-[#0e121b] hover:border-[#c9cdd4] hover:bg-[#f5f7fa]",
  ghost: "text-[#525866] hover:text-[#0e121b] hover:bg-[#f5f7fa]",
};

const BUTTON_SIZES: Record<DashboardButtonSize, string> = {
  sm: "h-[30px] px-2.5 text-xs rounded-md",
  md: "h-[34px] px-3 text-xs rounded-md",
  icon: "h-[34px] w-[34px] rounded-md",
};

/**
 * Dashboard button component with variants for primary, outline, ghost, and warning states.
 */
const DashboardButton = forwardRef<HTMLButtonElement, DashboardButtonProps>(
  (
    { className, variant = "primary", size = "md", children, ...props },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type="button"
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

DashboardButton.displayName = "DashboardButton";

/**
 * Dashboard link styled as a button.
 */
function DashboardLinkButton({
  href,
  target,
  variant = "outline",
  size = "md",
  disabled,
  title,
  className,
  children,
  onClick,
}: DashboardLinkButtonProps) {
  return (
    <Link
      href={href}
      target={target}
      title={title}
      onClick={(e) => {
        if (disabled) {
          e.preventDefault();
        }
        onClick?.(e);
      }}
      className={cn(
        BUTTON_BASE,
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        disabled && "opacity-50 cursor-not-allowed pointer-events-none",
        className
      )}
    >
      {children}
    </Link>
  );
}

export {
  DashboardButton,
  DashboardLinkButton,
  type DashboardButtonVariant,
  type DashboardButtonSize,
};
