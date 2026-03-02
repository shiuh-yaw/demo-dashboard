"use client";

import { forwardRef, type ReactNode, type ButtonHTMLAttributes } from "react";
import { cn } from "@dynamic-demos/utils";

export interface ListRowProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> {
  /** Left side icon or image */
  icon?: ReactNode;
  /** Icon URL (used if icon prop not provided) */
  iconUrl?: string;
  /** Fallback icon URL if primary fails */
  iconUrlFallback?: string;
  /** Main label/title */
  label: string;
  /** Secondary text below label */
  sublabel?: ReactNode;
  /** Right side content */
  rightContent?: ReactNode;
  /** Whether this row is in a loading state */
  isLoading?: boolean;
  /** Loading text to display */
  loadingText?: string;
  /** Row height variant */
  size?: "sm" | "md" | "lg";
  /** Icon size */
  iconSize?: "sm" | "md" | "lg";
  /** Make the icon rounded (circle) */
  iconRounded?: boolean;
}

const ROW_SIZES = {
  sm: "h-[38px] py-1",
  md: "h-[43px] py-1",
  lg: "h-[46px] py-1.5",
};

const ICON_SIZES = {
  sm: "w-5 h-5",
  md: "w-7 h-7",
  lg: "w-8 h-8",
};

/**
 * Base list row component for wallet/asset/chain selection.
 * Uses CSS variables for theming (--widget-*).
 */
const ListRow = forwardRef<HTMLButtonElement, ListRowProps>(
  (
    {
      icon,
      iconUrl,
      iconUrlFallback,
      label,
      sublabel,
      rightContent,
      isLoading = false,
      loadingText = "Loading...",
      size = "md",
      iconSize = "md",
      iconRounded = false,
      disabled = false,
      className,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled || isLoading}
        className={cn(
          // Layout
          "w-full flex items-center justify-between",
          "bg-[var(--widget-row-bg,#f6f8f8)] rounded-[var(--widget-radius,10px)]",
          "pl-3 pr-2.5",
          ROW_SIZES[size],
          // Transitions
          "transition-all duration-150",
          // States
          "hover:bg-[var(--widget-row-hover,#eef1f1)] active:opacity-80",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "cursor-pointer",
          className,
        )}
        {...props}
      >
        {/* Left: Icon + Label */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              "shrink-0 flex items-center justify-center",
              ICON_SIZES[iconSize],
              iconRounded ? "rounded-full" : "rounded",
            )}
          >
            {icon ? (
              icon
            ) : iconUrl ? (
              <img
                src={iconUrl}
                alt={label}
                className={cn(
                  "w-full h-full object-contain",
                  iconRounded ? "rounded-full" : "rounded",
                )}
                onError={(e) => {
                  if (
                    iconUrlFallback &&
                    e.currentTarget.src !== iconUrlFallback
                  ) {
                    e.currentTarget.src = iconUrlFallback;
                  }
                }}
              />
            ) : (
              <div
                className={cn(
                  "w-full h-full bg-gradient-to-br from-gray-300 to-gray-400",
                  iconRounded ? "rounded-full" : "rounded",
                )}
              />
            )}
          </div>
          <div className="flex flex-col items-start min-w-0">
            <span className="text-sm font-medium text-[var(--widget-fg,#000000)] tracking-[-0.14px] leading-[18px] truncate">
              {label}
            </span>
            {isLoading ? (
              <span className="text-xs text-[var(--widget-accent,#4779ff)] tracking-[-0.12px] leading-4">
                {loadingText}
              </span>
            ) : sublabel ? (
              <span className="text-xs text-[var(--widget-muted,#9a9a9a)] tracking-[-0.12px] leading-4 truncate">
                {sublabel}
              </span>
            ) : null}
          </div>
        </div>

        {/* Right: Custom content or loading spinner */}
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-[var(--widget-accent,#4779ff)] border-t-transparent rounded-full animate-spin" />
        ) : rightContent ? (
          <div className="flex items-center gap-2 shrink-0">{rightContent}</div>
        ) : null}
      </button>
    );
  },
);

ListRow.displayName = "ListRow";

export { ListRow };
