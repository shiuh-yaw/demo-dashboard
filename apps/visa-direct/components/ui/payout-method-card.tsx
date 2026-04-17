"use client";

import { Button } from "@dynamic-demos/ui";
import { cn } from "@dynamic-demos/utils";

export interface BadgeVariant {
  label: string;
  /** "default" = coral/primary, "configured" = blue */
  variant: "default" | "configured";
}

interface PayoutMethodCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: BadgeVariant;
  detailLeft?: string;
  detailRight?: string;
  isDefault: boolean;
  onSetDefault?: () => void;
  /** Additional content (e.g. wallet sub-option cards) */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Reusable payout method card.
 * Displays icon, title, description, optional badge, detail row, and set-as-default action.
 */
export function PayoutMethodCard({
  icon,
  title,
  description,
  badge,
  detailLeft,
  detailRight,
  isDefault,
  onSetDefault,
  children,
  className,
}: PayoutMethodCardProps) {
  return (
    <div
      className={cn(
        "bg-(--widget-bg) rounded-(--widget-radius) border border-(--widget-border) p-5",
        isDefault && "border-(--widget-primary)/40 shadow-sm",
        className,
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {/* Icon */}
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-(--widget-row-bg) border border-(--widget-border) text-(--widget-muted) flex-shrink-0">
            {icon}
          </div>
          {/* Title + description */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-(--widget-fg)">
                {title}
              </h3>
              {badge && (
                <span
                  className={cn(
                    "text-[11px] font-semibold rounded-full px-2.5 py-0.5",
                    badge.variant === "default" &&
                      "bg-(--widget-primary) text-white",
                    badge.variant === "configured" &&
                      "bg-(--widget-status-info-bg) text-(--widget-status-info-fg)",
                  )}
                >
                  {badge.label}
                </span>
              )}
            </div>
            <p className="text-sm text-(--widget-muted) mt-0.5 truncate">
              {description}
            </p>
          </div>
        </div>

        {/* Set as default action */}
        {!isDefault && onSetDefault && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSetDefault}
            className="flex-shrink-0 text-xs"
          >
            Set as default
          </Button>
        )}
      </div>

      {/* Detail row */}
      {(detailLeft ?? detailRight) && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-(--widget-border)">
          {detailLeft && (
            <span className="text-xs text-(--widget-muted)">{detailLeft}</span>
          )}
          {detailRight && (
            <span className="text-xs text-(--widget-muted)">{detailRight}</span>
          )}
        </div>
      )}

      {/* Children (e.g. wallet sub-options) */}
      {children && <div className="mt-4 space-y-2">{children}</div>}
    </div>
  );
}
