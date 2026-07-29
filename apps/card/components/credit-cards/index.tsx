"use client";

/**
 * Presentational credit-card face for `/card`. Loosely adapted from the OSS
 * reference (nextjs-stablecoin-card-rain/components/credit-cards/index.tsx)
 * and this repo's own pre-existing `apps/earn/src/components/credit-cards/`
 * port of the same OSS component. The card face is the single place PAN/CVC
 * reveal renders: `CardView` owns the reveal state (via `useCardDetails`)
 * and passes `pan`/`cvc`/`revealed` down here. When `revealed` is true the
 * real PAN (grouped every 4 digits) and CVC render with a `CopyButton` each;
 * otherwise the face stays masked to the last 4 digits. The hover-tilt
 * effect is kept as genuine presentation flair ported from the OSS
 * component.
 *
 * Card-network icons come from `@dynamic-demos/ui`'s `credit-card-icons`
 * (already the canonical port of the OSS `icons.tsx` for this repo) rather
 * than duplicating that file here. Rain's `CreateCardForUserResponse` type
 * has no card-network field, so `cardType` defaults to "mastercard" (same
 * default apps/earn uses) - a display assumption, not a value read from Rain.
 */

import { useState, type ReactNode } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@dynamic-demos/utils";
import {
  VisaIconWhite,
  MastercardIconWhite,
  CopyButton,
  type CardType,
} from "@dynamic-demos/ui";
import type { RainCard } from "@/lib/rain-card";

export interface CreditCardVisualProps {
  card: RainCard;
  /** Brand logo rendered top-left in place of the `company` text label. */
  brandLogo?: ReactNode;
  company?: string;
  cardType?: CardType;
  className?: string;
  /** Decrypted PAN, or null while masked/not yet revealed. */
  pan?: string | null;
  /** Decrypted CVC, or null while masked/not yet revealed. */
  cvc?: string | null;
  /** When true and `pan`/`cvc` are set, show the real values with copy icons. */
  revealed?: boolean;
  /** Reveal is in flight (shows a spinner on the toggle). */
  isRevealing?: boolean;
  /** Toggle reveal/hide - renders the eye button on the card when provided. */
  onToggleReveal?: () => void;
}

function formatExpiry(card: RainCard): string {
  return `${card.expirationMonth}/${card.expirationYear.slice(-2)}`;
}

function formatPan(pan: string): string {
  return pan.replace(/(.{4})(?=.)/g, "$1 ");
}

export function CreditCardVisual({
  card,
  brandLogo,
  company = "Card",
  cardType = "visa",
  className,
  pan = null,
  cvc = null,
  revealed = false,
  isRevealing = false,
  onToggleReveal,
}: CreditCardVisualProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left - rect.width / 2,
      y: e.clientY - rect.top - rect.height / 2,
    });
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setMousePosition({ x: 0, y: 0 });
  };

  const tiltStyle = isHovered
    ? {
        transform: `perspective(1000px) rotateX(${(-mousePosition.y / 200) * 8}deg) rotateY(${(mousePosition.x / 200) * 8}deg) scale3d(1.02, 1.02, 1.02)`,
        boxShadow:
          "0 8px 20px -8px rgba(0, 0, 0, 0.15), 0 0 15px rgba(255, 255, 255, 0.05)",
      }
    : undefined;

  const CardLogo = cardType === "visa" ? VisaIconWhite : MastercardIconWhite;

  // Card face carries the brand hue as the dominant color, darkened toward
  // near-black just enough to keep white text / the network mark legible.
  // The brand share is high (40% -> 65%) so distinct hues stay distinct -
  // a coral and a crimson read as coral and crimson, not the same maroon.
  // Tradeoff: a very light brand (bright yellow/cyan) will push white-text
  // contrast to the edge; mid-tone brands are the expected case. (The light
  // `--brand-card-gradient-*` tokens are for light "token cards", not this
  // debit-card face.)
  const cardGradient =
    "linear-gradient(to top right, color-mix(in srgb, var(--brand-primary) 40%, #0d0d10), color-mix(in srgb, var(--brand-primary) 65%, #17171b))";

  return (
    <div
      className={cn("aspect-316/190 relative w-full", className)}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="before:mask-linear-135 before:mask-linear-to-white/20 absolute inset-0 flex transform-gpu flex-col justify-between overflow-hidden rounded-2xl p-4 text-white shadow-lg shadow-black/10 transition-all duration-200 ease-out will-change-transform before:pointer-events-none before:absolute before:inset-0 before:z-1 before:rounded-[inherit] before:ring-1 before:ring-white/30 before:ring-inset"
        style={{ backgroundImage: cardGradient, ...tiltStyle }}
      >
        <div className="relative flex items-center justify-between gap-2">
          {brandLogo ?? (
            <span className="text-sm font-semibold sm:text-base">{company}</span>
          )}
          {onToggleReveal && (
            <button
              type="button"
              onClick={onToggleReveal}
              disabled={isRevealing}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={revealed ? "Hide card details" : "Reveal card details"}
              title={revealed ? "Hide card details" : "Reveal card details"}
            >
              {isRevealing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : revealed ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        <div className="relative flex items-end justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-2">
            <span className="flex items-center gap-1.5 text-sm font-semibold tracking-wider tabular-nums sm:text-base">
              {revealed && pan
                ? formatPan(pan)
                : `•••• •••• •••• ${card.last4}`}
              {revealed && pan && (
                <CopyButton
                  text={pan}
                  label="Copy card number"
                  size="sm"
                  className="text-white/70 hover:text-white"
                />
              )}
            </span>
            <div className="flex items-end gap-3 text-xs sm:text-sm">
              <span className="flex items-center gap-1 tracking-wider uppercase">
                <span className="opacity-60">CVV</span>{" "}
                {revealed && cvc ? cvc : "•••"}
                {revealed && cvc && (
                  <CopyButton
                    text={cvc}
                    label="Copy CVV"
                    size="sm"
                    className="text-white/70 hover:text-white"
                  />
                )}
              </span>
              <span className="tracking-wider tabular-nums">
                <span className="opacity-60">EXP</span> {formatExpiry(card)}
              </span>
            </div>
          </div>
          <div className="flex h-6 w-10 shrink-0 items-center justify-center rounded bg-white/20 sm:h-8 sm:w-12">
            <CardLogo />
          </div>
        </div>
      </div>
    </div>
  );
}
