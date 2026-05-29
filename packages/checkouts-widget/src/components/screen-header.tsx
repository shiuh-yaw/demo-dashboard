"use client";

import { X } from "lucide-react";
import { type ReactNode } from "react";
import { cn } from "@dynamic-demos/utils";

interface ScreenHeaderProps {
  /**
   * Small uppercase eyebrow label above the title (10px, muted,
   * letterspaced). Matches the asset-selector's "PAY WITH" header.
   * Pass `mode.toUpperCase()` from the host for "PAYMENT" / "DEPOSIT"
   * / "WITHDRAW" or any other short context label.
   */
  eyebrow?: ReactNode;
  /** Primary title. */
  title: ReactNode;
  /** Optional explanatory line under the title. */
  subtitle?: ReactNode;
  /** Close-button handler. When undefined, no button renders. */
  onClose?: () => void;
  /** Reserve close-button space even when `onClose` is absent (keeps
   *  the title centered between two equal margins). */
  showClosePlaceholder?: boolean;
  /** Hide the bottom border (useful when the next section provides
   *  its own divider). */
  noBorder?: boolean;
}

/**
 * Shared screen header — eyebrow + title + optional subtitle on the
 * left, close X on the right. Matches the asset-selector's "PAY WITH"
 * / "Pick a token" pattern so every screen in the widget reads with
 * the same hierarchy.
 *
 * The previous shape — a 38px white-card icon + medium title — was
 * inconsistent with the picker header that hosts apps had been
 * landing on. This is the normalized version.
 */
export default function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  onClose,
  showClosePlaceholder = false,
  noBorder = false,
}: ScreenHeaderProps) {
  return (
    <div
      className={cn(
        // 20px (p-5) matches the outer padding the picker screens use
        // when mounted inside <CheckoutWidget>. Keeps the "eyebrow ↔
        // card edge" distance consistent across every header in the
        // widget so the review/processing screens don't read as
        // tighter than the picker.
        "flex items-start justify-between gap-3 p-5",
        !noBorder && "border-b border-(--brand-border)",
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        {eyebrow && (
          <span className="text-[10px] uppercase tracking-[0.18em] text-(--brand-muted) font-medium">
            {eyebrow}
          </span>
        )}
        <h2 className="text-base font-semibold text-(--brand-fg) tracking-[-0.01em] leading-snug">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-(--brand-muted) tracking-[-0.12px] leading-snug">
            {subtitle}
          </p>
        )}
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="shrink-0 p-1 hover:bg-(--brand-row-hover) rounded transition-colors cursor-pointer"
        >
          <X className="w-4 h-4 text-(--brand-muted)" />
        </button>
      ) : showClosePlaceholder ? (
        <div className="w-6 h-6 shrink-0" />
      ) : null}
    </div>
  );
}
