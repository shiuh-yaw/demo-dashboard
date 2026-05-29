"use client";

/**
 * Review Screen Component
 *
 * Displays transaction details for user review before confirmation.
 * Shows source/destination tokens, fees, and total amounts.
 *
 * @module components/payment-widget/screens/review-screen
 */

import { WidgetCard } from "@dynamic-demos/ui";
import { ReviewPaymentScreen } from "@dynamic-demos/checkouts-widget";
import type { WidgetConfig } from "@/lib/widget-config";
import { isExchangeToken, type TokenAsset } from "@dynamic-demos/checkouts-widget";
import type { ReviewQuote } from "@/lib/types";
import { formatTokenAmount, formatUsd, formatApproxUsd } from "@/lib/format";
import {
  needsTokenConversion,
  buildSourceTokenInfo,
  buildDestinationTokenInfo,
  calculateFeeBreakdown,
} from "../utils";

// =============================================================================
// TYPES
// =============================================================================

export interface ReviewScreenProps {
  /** Current payment amount */
  amount: number;
  /** Selected token for payment */
  token: TokenAsset;
  /** Widget configuration */
  config: WidgetConfig;
  /** Quote result from LI.FI (null for direct transfers) */
  quote: ReviewQuote | null;
  /** Embedded wallet address for display (when depositDestination is "embedded") */
  embeddedWalletAddress: string | null;
  /** Whether a transaction is currently executing */
  isExecuting: boolean;
  /** Error message (swap, quote, or exchange) */
  error: string | null;
  /** Whether screen is transitioning */
  isTransitioning: boolean;
  /** Called when user confirms payment */
  onConfirm: () => void;
  /** Called when user goes back to asset selection */
  onBack: () => void;
  /** Called when user closes the widget */
  onClose: () => void;
  /** Called to clear the current error */
  onClearError: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ReviewScreen({
  amount,
  token,
  config,
  quote,
  embeddedWalletAddress,
  isExecuting,
  error,
  isTransitioning,
  onConfirm,
  onBack,
  onClose,
  onClearError,
}: ReviewScreenProps) {
  const { settlement } = config;
  const isSameToken = !needsTokenConversion(token, settlement);
  const isExchange = isExchangeToken(token);

  const {
    totalUsd,
    sourceAmount,
    sourceAmountNum,
    itemTotalToken,
    feeUsd,
    feeToken,
  } = calculateFeeBreakdown(amount, quote, isSameToken);

  // Pre-compute display values to avoid repeated ternaries in JSX.
  // Exchange tokens show raw amounts (fees are opaque); wallet tokens show USD conversions.
  const exchangeAmount = `${amount} ${token.symbol}`;

  const sourceTokenAmount = isExchange ? `${amount}` : sourceAmount;
  const sourceTokenSubtitle = isExchange ? exchangeAmount : formatUsd(totalUsd);

  const itemTotalDisplay = {
    usd: isExchange ? exchangeAmount : formatUsd(amount),
    token: `${formatTokenAmount(isExchange ? amount : itemTotalToken)} ${token.symbol}`,
  };

  const totalAmountDisplay = {
    usd: isExchange ? exchangeAmount : formatUsd(totalUsd),
    token: `${formatTokenAmount(isExchange ? amount : sourceAmountNum)} ${token.symbol}`,
  };

  // TODO: Integrate Kraken's WithdrawInfo API (POST /0/private/WithdrawInfo)
  // to show actual withdrawal fees. Dynamic SDK does not currently expose this
  // endpoint. Once available, call it during token selection and pass the fee
  // amount here instead of the disclaimer text.
  const networkFee = isExchange
    ? { usd: "Exchange fees may apply", token: "Exchange fees may apply" }
    : {
        usd: formatApproxUsd(feeUsd),
        token: `~${formatTokenAmount(feeToken)} ${token.symbol}`,
      };

  return (
    <WidgetCard isTransitioning={isTransitioning}>
      <ReviewPaymentScreen
        mode={config.mode}
        sourceToken={buildSourceTokenInfo(
          token,
          sourceTokenAmount,
          sourceTokenSubtitle,
          quote,
        )}
        destinationToken={
          !isSameToken && quote ? buildDestinationTokenInfo(quote) : undefined
        }
        destinationAddress={
          config.depositDestination === "embedded"
            ? (embeddedWalletAddress ?? undefined)
            : undefined
        }
        itemTotal={itemTotalDisplay}
        networkFee={networkFee}
        totalAmount={totalAmountDisplay}
        isExecuting={isExecuting}
        error={error}
        onBack={onBack}
        onClose={onClose}
        onConfirm={onConfirm}
        onClearError={onClearError}
      />
    </WidgetCard>
  );
}
