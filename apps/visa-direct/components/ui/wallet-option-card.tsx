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
          ? "border-(--brand-primary) bg-(--brand-primary)/5"
          : "border-(--brand-border) bg-(--brand-row-bg) hover:bg-(--brand-row-hover)",
      )}
    >
      <div
        className={cn(
          "w-8 h-8 flex items-center justify-center rounded-md border flex-shrink-0 mt-0.5 transition-colors",
          selected
            ? "bg-(--brand-primary)/10 border-(--brand-primary)/30 text-(--brand-primary)"
            : "bg-(--brand-surface) border-(--brand-border) text-(--brand-muted)",
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p
          className={cn(
            "text-sm font-medium",
            selected ? "text-(--brand-primary)" : "text-(--brand-fg)",
          )}
        >
          {title}
        </p>
        <p className="text-xs text-(--brand-muted) mt-0.5">{description}</p>
      </div>
    </button>
  );
}
