"use client";

import { cn } from "@dynamic-demos/utils";

interface WalletOptionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  selected?: boolean;
  onClick?: () => void;
}

/**
 * Sub-option card for wallet choice (BYO CeFi vs embedded wallet).
 * The entire card is the tap target — no inner button.
 */
export function WalletOptionCard({
  icon,
  title,
  description,
  selected,
  onClick,
}: WalletOptionCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors",
        selected
          ? "border-(--widget-primary) bg-(--widget-primary)/5"
          : "border-(--widget-border) bg-(--widget-row-bg) hover:bg-(--widget-row-hover)",
      )}
    >
      <div
        className={cn(
          "w-8 h-8 flex items-center justify-center rounded-md border flex-shrink-0 mt-0.5 transition-colors",
          selected
            ? "bg-(--widget-primary)/10 border-(--widget-primary)/30 text-(--widget-primary)"
            : "bg-(--widget-bg) border-(--widget-border) text-(--widget-muted)",
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p
          className={cn(
            "text-sm font-medium",
            selected ? "text-(--widget-primary)" : "text-(--widget-fg)",
          )}
        >
          {title}
        </p>
        <p className="text-xs text-(--widget-muted) mt-0.5">{description}</p>
      </div>
    </button>
  );
}
