"use client";

import { useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { formatCurrency } from "@dynamic-demos/utils";
import {
  VisaIcon,
  VisaIconWhite,
  MastercardIcon,
  MastercardIconWhite,
  type CardType,
} from "./credit-card-icons";
import { DynamicLogo } from "./dynamic-logo";
import { Skeleton } from "./skeleton";

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits
    .replace(/(\d{4})(?=\d)/g, "$1 ")
    .trim()
    .slice(0, 19);
}

function maskCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return value;
  const last4 = digits.slice(-4);
  return `•••• •••• •••• ${last4}`;
}

const CARD_VARIANTS = {
  /** Dark blue gradient using theme primary (--widget-primary). For remittance/widget UIs. */
  primary: {
    root: "bg-linear-to-br from-(--widget-primary) to-(--widget-card-gradient-end) before:pointer-events-none before:absolute before:inset-0 before:z-1 before:rounded-[inherit] before:mask-linear-135 before:mask-linear-to-white/20 before:ring-1 before:ring-white/30 before:ring-inset",
    circleClass: "bg-white",
    company: "text-white",
    footerText: "text-white",
    cardTypeRoot: "bg-white/10",
    isLight: false,
  },
  /** Dark blue gradient using brand colors. For earn app. */
  "brand-dark": {
    root: "bg-linear-to-tr from-brand-900 to-brand-700 before:pointer-events-none before:absolute before:inset-0 before:z-1 before:rounded-[inherit] before:mask-linear-135 before:mask-linear-to-white/20 before:ring-1 before:ring-white/30 before:ring-inset",
    circleClass: "bg-white",
    company: "text-white",
    footerText: "text-white",
    cardTypeRoot: "bg-white/10",
    isLight: false,
  },
  /** Fallback dark blue when brand colors unavailable. */
  "primary-fallback": {
    root: "bg-linear-to-tr from-[#1e3a8a] to-[#2563eb] before:pointer-events-none before:absolute before:inset-0 before:z-1 before:rounded-[inherit] before:mask-linear-135 before:mask-linear-to-white/20 before:ring-1 before:ring-white/30 before:ring-inset",
    circleClass: "bg-white",
    company: "text-white",
    footerText: "text-white",
    cardTypeRoot: "bg-white/10",
    isLight: false,
  },
  /** Light gray card. For earn app prepaid card. */
  "gray-light": {
    root: "bg-gray-100 before:pointer-events-none before:absolute before:inset-0 before:z-1 before:rounded-[inherit] before:mask-linear-135 before:mask-linear-to-white/20 before:ring-1 before:ring-black/10 before:ring-inset",
    circleClass: "bg-white",
    company: "text-gray-700",
    footerText: "text-gray-700",
    cardTypeRoot: "bg-white",
    isLight: true,
  },
  /** Neutral light slate/gray card. Generic, does not compete with brand logos. */
  neutral: {
    root: "bg-linear-to-br from-slate-300 to-slate-200 before:pointer-events-none before:absolute before:inset-0 before:z-1 before:rounded-[inherit] before:mask-linear-135 before:mask-linear-to-white/20 before:ring-1 before:ring-slate-200 before:ring-inset",
    circleClass: "bg-white",
    company: "text-slate-800",
    footerText: "text-slate-800",
    cardTypeRoot: "bg-white/80",
    isLight: true,
  },
} as const;

export type StableCoinCardVariant = keyof typeof CARD_VARIANTS;

export interface StableCoinCardProps {
  /** Card label (e.g. "Stablecoin Card", "Prepaid card") */
  company?: string;
  /** Masked or partial card number for display */
  cardNumber: string;
  /** Full card number for reveal toggle (optional) */
  fullCardNumber?: string;
  /** CVV for display when revealed (optional). When omitted, shows "..." when masked. */
  cardCvv?: string;
  /** Expiry date (e.g. "06/28") */
  cardExpiration?: string;
  /** Balance to display (number or string) */
  balance?: number | string;
  /** Currency for formatting (e.g. "USD") */
  currency?: string;
  /** Card network logo */
  cardType?: CardType;
  /** Visual variant */
  variant?: StableCoinCardVariant;
  /** Optional logo/brand to show next to company (e.g. AppLogo). When omitted, Dynamic logo is shown on the left by default. */
  logo?: React.ReactNode;
  /** Show Dynamic logo on the left when no custom logo is provided. Default: true. */
  showDynamicLogo?: boolean;
  /** Add funds button (earn app) */
  showAddFundsButton?: boolean;
  onAddFunds?: () => void;
  /** When true, show loading skeleton on balance instead of value */
  balanceLoading?: boolean;
  className?: string;
}

/**
 * Reusable stablecoin / prepaid card component.
 * Matches the design used in earn app, usable in remittance and other apps.
 */
export function StableCoinCard({
  company = "Stablecoin Card",
  cardNumber,
  fullCardNumber,
  cardCvv,
  cardExpiration = "06/28",
  balance,
  currency = "USD",
  cardType = "visa",
  variant = "primary",
  logo,
  showDynamicLogo = true,
  showAddFundsButton = false,
  onAddFunds,
  balanceLoading = false,
  className,
}: StableCoinCardProps) {
  const [showCardDetails, setShowCardDetails] = useState(false);
  const style = CARD_VARIANTS[variant] ?? CARD_VARIANTS["primary-fallback"];

  const displayCardNumber = useMemo(() => {
    if (showCardDetails && fullCardNumber) {
      return formatCardNumber(fullCardNumber);
    }
    if (cardNumber.includes("....") || cardNumber.includes("••••")) {
      return cardNumber.replace(/\./g, "•");
    }
    const digits = String(cardNumber).replace(/\D/g, "");
    if (digits.length >= 4) {
      return maskCardNumber(cardNumber);
    }
    return cardNumber;
  }, [showCardDetails, fullCardNumber, cardNumber]);

  const balanceDisplay =
    balance !== undefined && balance !== ""
      ? typeof balance === "number"
        ? formatCurrency(balance, { symbol: true })
        : formatCurrency(Number(balance), { symbol: true })
      : null;

  const useWhiteLogo = !style.isLight;
  const CardLogo =
    cardType === "visa"
      ? useWhiteLogo
        ? VisaIconWhite
        : VisaIcon
      : useWhiteLogo
        ? MastercardIconWhite
        : MastercardIcon;

  return (
    <div
      className={`w-full aspect-[316/190] relative overflow-hidden rounded-2xl p-5 flex flex-col justify-between shadow-lg shadow-black/10 ${style.root} ${className ?? ""}`}
    >
      {/* Subtle pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.12] pointer-events-none"
        aria-hidden
      >
        <div
          className={`absolute -top-8 -right-8 w-32 h-32 rounded-full ${style.circleClass}`}
        />
        <div
          className={`absolute -bottom-12 -left-12 w-40 h-40 rounded-full ${style.circleClass}`}
        />
      </div>

      <div className="relative flex flex-col gap-5 flex-1">
        {/* Top: Logo + company | Add funds */}
        <div className="flex items-center justify-between min-w-0">
          <div className="flex items-center gap-2 min-w-0 overflow-visible">
            {logo ??
              (showDynamicLogo ? (
                <DynamicLogo
                  wordmark={false}
                  className={
                    style.isLight
                      ? "h-4 text-gray-700 shrink-0"
                      : "h-4 text-white shrink-0"
                  }
                />
              ) : null)}
            <span
              className={`text-xs sm:text-sm font-medium leading-tight opacity-90 ${style.company}`}
            >
              {company}
            </span>
          </div>
          {showAddFundsButton && onAddFunds && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddFunds();
              }}
              className={
                style.isLight
                  ? "px-3 py-1.5 rounded-md text-xs font-medium bg-white text-gray-900 hover:bg-gray-50 border border-gray-200 shrink-0"
                  : "px-3 py-1.5 rounded-md text-xs font-medium bg-white/20 text-white hover:bg-white/30 border border-white/30 backdrop-blur-sm transition-colors shrink-0"
              }
            >
              Add funds
            </button>
          )}
        </div>

        {/* Balance */}
        {balanceLoading ? (
          <Skeleton
            className={`h-8 w-24 rounded-md ${style.isLight ? "bg-gray-300" : "bg-white/30"}`}
            aria-label="Loading balance"
          />
        ) : (
          balanceDisplay && (
            <p
              className={`text-2xl sm:text-3xl font-bold tracking-tight ${style.footerText}`}
            >
              {balanceDisplay}
            </p>
          )
        )}

        {/* Bottom: Card number, CVV, EXP | Eye + logo */}
        <div className="mt-auto flex items-end justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <div
              className={`text-sm sm:text-base font-semibold tracking-[0.15em] tabular-nums leading-tight ${style.footerText} ${!showCardDetails ? "opacity-70" : ""}`}
            >
              {displayCardNumber}
            </div>
            <div className="flex items-center gap-3">
              <div
                className={`text-xs sm:text-sm font-medium tracking-wider uppercase leading-tight ${style.footerText}`}
              >
                <span className="opacity-60">CVV </span>
                {showCardDetails && cardCvv ? (
                  <span>{cardCvv}</span>
                ) : (
                  <span className="opacity-60">•••</span>
                )}
              </div>
              {cardExpiration && (
                <div
                  className={`text-xs sm:text-sm font-medium tracking-wider tabular-nums leading-tight ${style.footerText}`}
                >
                  <span className="opacity-60">EXP </span>
                  <span>{cardExpiration}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowCardDetails(!showCardDetails)}
              className={
                style.isLight
                  ? "p-2 rounded-lg text-gray-600 hover:bg-white/50 transition-colors duration-200"
                  : "p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors duration-200"
              }
              aria-label={
                showCardDetails ? "Hide card details" : "Show card details"
              }
            >
              {showCardDetails ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
            <div
              className={`flex h-7 w-11 sm:h-8 sm:w-14 items-center justify-center rounded-lg px-1.5 ${style.cardTypeRoot}`}
            >
              <CardLogo className="h-4 w-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
