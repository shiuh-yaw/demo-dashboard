"use client";

/**
 * Processing Screen Component
 *
 * Displays transaction progress with steps, handles completion and retry.
 *
 * @module components/payment-widget/screens/processing-screen
 */

import { WidgetCard } from "@dynamic-demos/ui";
import {
  TransactionProgressScreen,
  type TransactionStep,
} from "@dynamic-demos/checkouts-widget";
import type { WidgetConfig } from "@/lib/widget-config";
import type { TokenAsset } from "@dynamic-demos/checkouts-widget";
import type { ReviewQuote } from "@/lib/types";
import { formatUsd } from "@/lib/format";
import {
  needsTokenConversion,
  buildSourceTokenInfo,
  buildDestinationTokenInfo,
  getSourceAmount,
} from "../utils";

// =============================================================================
// TYPES
// =============================================================================

export interface ProcessingScreenProps {
  /** Current payment amount */
  amount: number;
  /** Selected token for payment */
  token: TokenAsset;
  /** Transaction steps with current status */
  steps: TransactionStep[];
  /** Explorer link for cross-chain tracking */
  explorerLink?: string;
  /** Widget configuration */
  config: WidgetConfig;
  /** Quote result from LI.FI (null for direct transfers) */
  quote: ReviewQuote | null;
  /** Error message (swap, quote, or exchange) */
  error: string | null;
  /** Whether screen is transitioning */
  isTransitioning: boolean;
  /** Called when user closes after completion/error */
  onClose: () => void;
  /** Called when user wants to retry after error */
  onRetry: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ProcessingScreen({
  amount,
  token,
  steps,
  explorerLink,
  config,
  quote,
  error,
  isTransitioning,
  onClose,
  onRetry,
}: ProcessingScreenProps) {
  const { settlement } = config;
  const isSameToken = !needsTokenConversion(token, settlement);
  const sourceAmount = getSourceAmount(quote, isSameToken, amount);

  return (
    <WidgetCard isTransitioning={isTransitioning}>
      <TransactionProgressScreen
        mode={config.mode}
        sourceToken={buildSourceTokenInfo(
          token,
          sourceAmount,
          formatUsd(amount),
          quote,
        )}
        destinationToken={
          !isSameToken && quote ? buildDestinationTokenInfo(quote) : undefined
        }
        steps={steps}
        explorerLink={explorerLink}
        error={error}
        onClose={onClose}
        onRetry={onRetry}
      />
    </WidgetCard>
  );
}
