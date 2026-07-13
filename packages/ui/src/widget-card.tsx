"use client";

import { forwardRef, type ReactNode, type HTMLAttributes } from "react";
import { ArrowLeft, X } from "lucide-react";
import { cn } from "@dynamic-demos/utils";

const surfaceClass =
  "bg-[var(--widget-bg,#ffffff)] text-[var(--widget-fg,#000000)] rounded-[var(--widget-radius-lg,22px)] overflow-hidden border border-[var(--widget-border,#e7e8ed)] shadow-[0px_8px_8px_-4px_rgba(10,13,18,0.03),0px_3px_3px_-1.5px_rgba(10,13,18,0.04)]";

const headerRuleClass = "border-b border-[var(--widget-border,#e7e8ed)]";

const headerIconBtnClass =
  "flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full transition-all hover:bg-[var(--widget-row-hover,#eef1f1)]";

const mutedIconClass = "h-4 w-4 text-[var(--widget-muted,#9a9a9a)]";

function HeaderTitle({
  title,
  subtitle,
}: {
  title?: string;
  subtitle?: ReactNode;
}) {
  if (!title && !subtitle) return null;
  return (
    <>
      {title ? (
        <h2 className="text-sm font-medium leading-5 text-[var(--widget-fg,#000000)]">
          {title}
        </h2>
      ) : null}
      {subtitle ? (
        <p className="text-xs leading-5 text-[var(--widget-muted,#9a9a9a)]">
          {subtitle}
        </p>
      ) : null}
    </>
  );
}

function endHeaderSpacerVisible(
  trailing: ReactNode | undefined,
  onClose: (() => void) | undefined,
) {
  return !trailing && !onClose;
}

export interface WidgetCardProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  title?: string;
  subtitle?: ReactNode;
  onBack?: () => void;
  onClose?: () => void;
  trailing?: ReactNode;
  isTransitioning?: boolean;
  footer?: ReactNode;
  contentPadding?: boolean;
}

const WidgetCard = forwardRef<HTMLDivElement, WidgetCardProps>(
  function WidgetCard(
    {
      children,
      icon,
      title,
      subtitle,
      onBack,
      onClose,
      trailing,
      isTransitioning,
      footer,
      contentPadding = true,
      className,
      ...props
    },
    ref,
  ) {
    const showHeader = Boolean(
      title || subtitle || onBack || onClose || icon || trailing,
    );
    const rightActions = Boolean(trailing || onClose);

    return (
      <div
        ref={ref}
        className={cn(
          surfaceClass,
          "transition-opacity duration-150",
          isTransitioning && "opacity-50",
          className,
        )}
        {...props}
      >
        {showHeader ? (
          <div className={cn("relative px-3 py-2.5", headerRuleClass)}>
            <div
              className={cn(
                "flex w-full items-start",
                !icon && !onBack && "min-h-9 items-center",
              )}
            >
              <div className="flex shrink-0 items-center gap-2">
                {onBack ? (
                  // Back button rides the icon slot (Add Wallet layout):
                  // boxed arrow, title/subtitle left-aligned beside it.
                  <div
                    className={cn(
                      "flex min-w-0 items-center gap-3",
                      rightActions && "pr-10",
                    )}
                  >
                    <button
                      type="button"
                      onClick={onBack}
                      aria-label="Go back"
                      className="group flex h-[38px] w-[38px] min-w-[38px] cursor-pointer items-center justify-center rounded-[9px] border border-[var(--widget-border,#e7e8ed)] bg-[var(--widget-row-bg,#f6f8f8)] shadow-[0px_0px_1px_-1px_rgba(0,0,0,0.04),0px_2px_4px_-1px_rgba(0,0,0,0.07)] transition-colors hover:bg-[var(--widget-row-hover,#eef1f1)]"
                    >
                      <ArrowLeft
                        className="h-[18px] w-[18px] text-[var(--widget-fg,#000000)] transition-transform duration-200 group-hover:-translate-x-0.5"
                        strokeWidth={1.5}
                        aria-hidden
                      />
                    </button>
                    <div className="flex min-w-0 flex-col">
                      <HeaderTitle title={title} subtitle={subtitle} />
                    </div>
                  </div>
                ) : icon ? (
                  <div
                    className={cn(
                      "flex min-w-0 items-center gap-3",
                      rightActions && "pr-10",
                    )}
                  >
                    <div className="flex h-[38px] w-[38px] min-w-[38px] items-center justify-center rounded-[9px] border border-[var(--widget-border,#e7e8ed)] bg-[var(--widget-row-bg,#f6f8f8)] shadow-[0px_0px_1px_-1px_rgba(0,0,0,0.04),0px_2px_4px_-1px_rgba(0,0,0,0.07)]">
                      {icon}
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <HeaderTitle title={title} subtitle={subtitle} />
                    </div>
                  </div>
                ) : (
                  <div className="w-6 shrink-0" aria-hidden />
                )}
              </div>

              {!icon && !onBack && (title || subtitle) ? (
                <div
                  className={cn(
                    "flex min-w-0 flex-1 flex-col items-center justify-center px-2",
                    rightActions && "pr-10",
                  )}
                >
                  <HeaderTitle title={title} subtitle={subtitle} />
                </div>
              ) : null}

              {!icon && !onBack && endHeaderSpacerVisible(trailing, onClose) ? (
                <div className="w-6 shrink-0" aria-hidden />
              ) : null}
            </div>

            {rightActions ? (
              <div
                className={cn(
                  "absolute right-3 z-10 flex items-center gap-0.5",
                  icon
                    ? "top-2.5"
                    : "top-1/2 -translate-y-1/2",
                )}
              >
                {trailing}
                {onClose ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className={headerIconBtnClass}
                    aria-label="Close"
                  >
                    <X className={mutedIconClass} strokeWidth={2} aria-hidden />
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className={showHeader && contentPadding ? "p-3" : undefined}>
          {children}
        </div>

        {footer ? (
          <div className="border-t border-[var(--widget-border,#e7e8ed)]">
            {footer}
          </div>
        ) : null}
      </div>
    );
  },
);

WidgetCard.displayName = "WidgetCard";

export const widgetHeaderTrailingIconButtonClassName =
  "shrink-0 flex h-8 w-8 items-center justify-center rounded-[max(0.375rem,calc(var(--widget-radius-lg,22px)-0.5rem))] text-[var(--widget-muted,#9a9a9a)] transition-colors hover:bg-[var(--widget-row-hover,#eef1f1)] hover:text-[var(--widget-fg,#000000)] cursor-pointer";

export { WidgetCard };
