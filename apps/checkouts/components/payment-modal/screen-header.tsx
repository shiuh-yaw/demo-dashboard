"use client";

import { X } from "lucide-react";
import { type ReactNode } from "react";
import { cn } from "@dynamic-demos/utils";

interface ScreenHeaderProps {
  /** Icon component to display */
  icon: ReactNode;
  /** Main title text */
  title: ReactNode;
  /** Subtitle/description text */
  subtitle?: ReactNode;
  /** Close button handler - if undefined, no close button shown */
  onClose?: () => void;
  /** Show a placeholder for the close button to maintain layout */
  showClosePlaceholder?: boolean;
  /** Hide the bottom border (useful when extending header with additional content) */
  noBorder?: boolean;
}

/**
 * Reusable header component for modal screens
 * Displays an icon, title, optional subtitle, and close button
 */
export default function ScreenHeader({
  icon,
  title,
  subtitle,
  onClose,
  showClosePlaceholder = false,
  noBorder = false,
}: ScreenHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between p-3",
        !noBorder && "border-b border-(--widget-border)",
      )}
    >
      <div className="flex items-center gap-3">
        <div className="w-[38px] h-[38px] min-w-[38px] flex items-center justify-center rounded-[9px] bg-(--widget-bg) border border-(--widget-border) shadow-[0px_0px_1px_-1px_rgba(0,0,0,0.04),0px_2px_4px_-1px_rgba(0,0,0,0.07)]">
          {icon}
        </div>
        <div className="flex flex-col">
          <h2 className="text-sm font-medium text-(--widget-fg) tracking-[-0.14px] leading-5">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-(--widget-muted) tracking-[-0.12px] leading-5">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="p-1 hover:bg-(--widget-row-hover) rounded transition-colors cursor-pointer"
        >
          <X className="w-4 h-4 text-(--widget-muted)" />
        </button>
      ) : showClosePlaceholder ? (
        <div className="w-6 h-6" />
      ) : null}
    </div>
  );
}
