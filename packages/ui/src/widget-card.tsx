"use client";

import { forwardRef, type ReactNode, type HTMLAttributes } from "react";
import { cn } from "@dynamic-demos/utils";

/** Close icon SVG (avoids lucide-react dependency) */
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

/** Back arrow icon SVG */
function BackIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

export interface WidgetCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Icon to display in header (enables icon-style header layout) */
  icon?: ReactNode;
  /** Card title */
  title?: string;
  /** Subtitle - can be string or ReactNode for custom content */
  subtitle?: ReactNode;
  /** Back button click handler */
  onBack?: () => void;
  /** Close button click handler */
  onClose?: () => void;
  /** Whether the card is transitioning (reduces opacity) */
  isTransitioning?: boolean;
  /** Optional footer content (e.g., "Powered by Dynamic") */
  footer?: ReactNode;
  /** Content padding - set to false for full-width content */
  contentPadding?: boolean;
}

/**
 * Universal widget card container with flexible header layouts.
 * Uses CSS variables for theming (--widget-*).
 *
 * Header layouts:
 * - With icon: [back?] [icon] [title/subtitle] ... [close?]
 * - Without icon: [back?] ... [title/subtitle centered] ... [close?]
 */
const WidgetCard = forwardRef<HTMLDivElement, WidgetCardProps>(
  (
    {
      children,
      icon,
      title,
      subtitle,
      onBack,
      onClose,
      isTransitioning,
      footer,
      contentPadding = true,
      className,
      ...props
    },
    ref
  ) => {
    const showHeader = title || subtitle || onBack || onClose || icon;

    return (
      <div
        ref={ref}
        className={cn(
          "bg-[var(--widget-bg,#ffffff)] text-[var(--widget-fg,#000000)]",
          "rounded-[var(--widget-radius-lg,22px)] overflow-hidden",
          "border border-[var(--widget-border,#e7e8ed)]",
          "shadow-[0px_8px_8px_-4px_rgba(10,13,18,0.03),0px_3px_3px_-1.5px_rgba(10,13,18,0.04)]",
          "transition-opacity duration-150",
          isTransitioning && "opacity-50",
          className
        )}
        {...props}
      >
        {showHeader && (
          <div
            className={cn(
              "flex items-start justify-between p-3 border-b border-[var(--widget-border,#e7e8ed)]",
              !icon && "items-center"
            )}
          >
            {/* Left side: back button and/or icon with title */}
            <div className="flex items-center gap-2">
              {/* Back Button */}
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="w-6 h-6 flex items-center justify-center shrink-0 cursor-pointer rounded-full hover:bg-[var(--widget-row-hover,#eef1f1)] transition-all"
                  aria-label="Go back"
                >
                  <BackIcon className="w-4 h-4 text-[var(--widget-muted,#9a9a9a)]" />
                </button>
              )}

              {/* Icon-style header: icon box + title */}
              {icon ? (
                <div className="flex items-center gap-3">
                  <div className="w-[38px] h-[38px] min-w-[38px] flex items-center justify-center rounded-[9px] bg-[var(--widget-row-bg,#f6f8f8)] border border-[var(--widget-border,#e7e8ed)] shadow-[0px_0px_1px_-1px_rgba(0,0,0,0.04),0px_2px_4px_-1px_rgba(0,0,0,0.07)]">
                    {icon}
                  </div>
                  <div className="flex flex-col">
                    {title && (
                      <h2 className="text-sm font-medium text-[var(--widget-fg,#000000)] tracking-[-0.14px] leading-5">
                        {title}
                      </h2>
                    )}
                    {subtitle && (
                      <p className="text-xs text-[var(--widget-muted,#9a9a9a)] tracking-[-0.12px] leading-5">
                        {subtitle}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                /* Spacer for centering when no icon and no back button */
                !onBack && <div className="w-6" />
              )}
            </div>

            {/* Centered title when no icon */}
            {!icon && (title || subtitle) && (
              <div className="flex flex-col items-center justify-center flex-1 min-w-0 px-2">
                {title && (
                  <h2 className="text-sm font-medium text-[var(--widget-fg,#000000)] tracking-[-0.14px] leading-5">
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p className="text-xs text-[var(--widget-muted,#9a9a9a)] tracking-[-0.12px] leading-5">
                    {subtitle}
                  </p>
                )}
              </div>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              disabled={!onClose}
              className={cn(
                "w-6 h-6 flex items-center justify-center shrink-0 transition-all rounded-full",
                onClose
                  ? "opacity-100 cursor-pointer hover:bg-[var(--widget-row-hover,#eef1f1)]"
                  : "opacity-0 pointer-events-none"
              )}
              aria-label="Close"
            >
              <CloseIcon className="w-4 h-4 text-[var(--widget-muted,#9a9a9a)]" />
            </button>
          </div>
        )}

        <div className={showHeader && contentPadding ? "p-3" : ""}>
          {children}
        </div>

        {footer && (
          <div className="border-t border-[var(--widget-border,#e7e8ed)]">
            {footer}
          </div>
        )}
      </div>
    );
  }
);

WidgetCard.displayName = "WidgetCard";

export { WidgetCard };
