"use client";

/**
 * Shared footer action button for the main card screen - the single source of
 * the footer-button look so Deposit / Get USDC / Activity are byte-for-byte
 * identical. Styled after wallet's footer-button idiom
 * (apps/wallet/components/wallet/create-wallet-buttons.tsx).
 */

import { Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@dynamic-demos/utils";

// NOTE: intentionally deviates from wallet's CreateWalletButtons idiom, which
// uses `--brand-muted` text. In a row of three primary card actions the muted
// grey read as disabled; these use `--brand-fg` so they read as enabled, with
// the row-hover background as the hover affordance.
export const footerButtonClassName = cn(
  "flex-1 flex items-center justify-center gap-1.5 px-3 h-9",
  "bg-(--brand-row-bg) rounded-(--brand-radius) border border-(--brand-border)",
  "text-xs font-medium text-(--brand-fg)",
  "hover:bg-(--brand-row-hover)",
  // Subtle press feedback: lift + faint shadow on hover, settle + shrink on
  // press. transition-all (below) animates it.
  "hover:-translate-y-px hover:shadow-sm active:translate-y-0 active:scale-[0.98]",
  "transition-all duration-150 cursor-pointer",
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none",
);

export interface FooterButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export function FooterButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  loading,
}: FooterButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={footerButtonClassName}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Icon className="w-4 h-4" />
      )}
      {label}
    </button>
  );
}
