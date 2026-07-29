"use client";

/**
 * Main `/card` screen - wallet's DashboardScreen idiom
 * (apps/wallet/components/screens/dashboard-screen.tsx) applied to the Rain
 * card: boxed-icon WidgetCard header (icon/title/subtitle/trailing logout
 * button), the card visual, info rows (card number/balance/available-to-
 * fund), an `h-px` divider, then a footer action row (+ Deposit / Get USDC /
 * Activity) styled after wallet's `CreateWalletButtons` footer-button idiom.
 */

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  CreditCard,
  Droplets,
  History,
  Loader2,
  LogOut,
  Plus,
} from "lucide-react";
import { logout } from "@dynamic-labs-sdk/client";
import {
  WidgetCard,
  widgetHeaderTrailingIconButtonClassName,
  DynamicLogo,
  Tooltip,
} from "@dynamic-demos/ui";
import { cn } from "@dynamic-demos/utils";

import type { RainCard } from "@/lib/rain-card";
import type { CardNavigationReturn } from "@/hooks/use-card-navigation";
import { useBranding } from "@/components/branding-provider";
import { useMilestoneOnce } from "@/hooks/use-milestone-once";
import { useWidgetNotice } from "@/contexts/widget-notice-context";
import { useFaucet } from "@/hooks/use-faucet";
import { CreditCardVisual } from "@/components/credit-cards";
import { CardBalanceRow } from "@/components/dynamic-card/card-balance";
import { AvailableToFundRow } from "@/components/dynamic-card/wallet-balance-display";
import { FooterButton } from "@/components/dynamic-card/footer-button";

export interface MainScreenProps {
  card: RainCard;
  navigation: CardNavigationReturn;
  pan: string | null;
  cvc: string | null;
  revealed: boolean;
  isRevealing: boolean;
  revealError: string | null;
  onToggleReveal: () => void;
}

export function MainScreen({
  card,
  navigation,
  pan,
  cvc,
  revealed,
  isRevealing,
  revealError,
  onToggleReveal,
}: MainScreenProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { mint, isMinting, error: faucetError } = useFaucet();
  const { name, logoUrl } = useBranding();
  const { message: noticeMessage } = useWidgetNotice();
  const milestoneOnce = useMilestoneOnce();

  // `card_viewed` - the provisioned card is on screen. Session-deduped so it
  // fires once per tab even as the main screen re-mounts across navigation.
  useEffect(() => {
    milestoneOnce("card_viewed");
  }, [milestoneOnce]);

  // Brand logo shown on the card face in place of a "Rain Card" text label.
  // Custom hosted logo when the demo config provides one; otherwise the
  // Dynamic logo (rendered white via `muted` + `text-white` for the dark card).
  const brandLogo = logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote brand logo, not a static asset
    <img
      src={logoUrl}
      alt={name ?? "Card"}
      className="h-9 w-auto max-w-[190px] object-contain"
    />
  ) : (
    <DynamicLogo
      wordmark
      muted
      tagline={false}
      className="h-7 w-auto text-white"
    />
  );

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <WidgetCard
      icon={
        <CreditCard
          className="w-[18px] h-[18px] text-(--brand-fg)"
          strokeWidth={1.5}
        />
      }
      title="Your card"
      subtitle="Stablecoin debit card"
      trailing={
        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={isLoggingOut}
          className={cn(
            widgetHeaderTrailingIconButtonClassName,
            "transition-transform duration-150 hover:scale-105 active:scale-90",
          )}
          aria-label="Log out"
          title="Log out"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        </button>
      }
    >
      <div className="relative flex min-h-[440px] flex-col gap-4">
        {noticeMessage && (
          <div
            className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 rounded-(--brand-radius) border border-(--brand-success)/20 bg-(--brand-surface)/95 px-3 py-2.5 text-sm font-medium text-(--brand-fg) shadow-lg shadow-black/5 backdrop-blur animate-[card-notice-in_200ms_ease-out]"
            role="status"
          >
            <CheckCircle2
              className="h-4 w-4 shrink-0 text-(--brand-success)"
              strokeWidth={2}
            />
            {noticeMessage}
          </div>
        )}
        <CreditCardVisual
          card={card}
          brandLogo={brandLogo}
          pan={pan}
          cvc={cvc}
          revealed={revealed}
          isRevealing={isRevealing}
          onToggleReveal={onToggleReveal}
        />

        {revealError && (
          <p className="text-xs text-(--brand-error)" role="alert">
            {revealError}
          </p>
        )}

        <div className="space-y-2">
          <CardBalanceRow enabled />
          <AvailableToFundRow />
        </div>

        <div className="mt-auto space-y-2">
          <div className="h-px bg-(--brand-border)" />
          <div className="flex items-center gap-2">
            {/* Deposit + Activity are the primary card actions. Get USDC is a
                testnet top-up helper (first login auto-funds), so it's a
                compact secondary button to the right. */}
            <FooterButton
              icon={Plus}
              label="Deposit"
              onClick={navigation.goToDeposit}
            />
            <FooterButton
              icon={History}
              label="Activity"
              onClick={navigation.goToActivity}
            />
            <Tooltip content="Get test USDC">
              <button
                type="button"
                onClick={() => void mint()}
                disabled={isMinting}
                aria-label="Get test USDC"
                className="flex h-9 w-9 shrink-0 items-center justify-center bg-(--brand-row-bg) rounded-(--brand-radius) border border-(--brand-border) text-(--brand-muted) hover:text-(--brand-fg) hover:bg-(--brand-row-hover) hover:-translate-y-px active:translate-y-0 active:scale-[0.98] transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isMinting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Droplets className="w-4 h-4" />
                )}
              </button>
            </Tooltip>
          </div>
          {faucetError && (
            <p className="text-xs text-(--brand-error)" role="alert">
              {faucetError}
            </p>
          )}
        </div>
      </div>
    </WidgetCard>
  );
}
