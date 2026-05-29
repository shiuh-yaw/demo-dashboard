"use client";

/**
 * Payment Actions Hook
 *
 * Orchestrates token selection and dashboard-mirror error/loading state for
 * the exchange (Kraken) path. The wallet-token path is delegated to
 * `<PaymentWidget />` from `@dynamic-demos/checkouts-widget`, which owns its
 * own Checkout Flow lifecycle (begin-checkout → quote → submit → settle).
 *
 * Architecture:
 * - Token selection (wallet pre-flight + exchange whitelisting): this file
 * - Recipient address resolution: this file
 * - Exchange payment execution: ./use-payment-execution.ts
 * - Wallet payment execution: <PaymentWidget /> (package-owned)
 *
 * @module components/payment-widget/use-payment-actions
 */

import { useCallback, useRef, useState } from "react";
import {
  getPrimaryWalletAccount,
  switchActiveNetwork,
  getActiveNetworkId,
  ensureEmbeddedWallet,
  type Chain,
} from "@/lib/dynamicClient";
import type { ExecutionUpdate } from "@/lib/types";
import { getActiveExchangeAdapter } from "@/lib/exchanges";
import { type WidgetConfig } from "@/lib/widget-config";
import { isExchangeToken, type TokenAsset } from "@dynamic-demos/checkouts-widget";
import type { Transaction } from "@/lib/types";
import type { TransactionStep } from "@dynamic-demos/checkouts-widget";
import { usePaymentExecution } from "./use-payment-execution";

// =============================================================================
// TYPES
// =============================================================================

interface UsePaymentActionsOptions {
  /** Widget configuration */
  config: WidgetConfig;
  /** Active exchange key (null = wallet mode) */
  activeExchangeKey?: string | null;
  /** Get current payment amount */
  getCurrentAmount: () => number;
  /** Navigate to review screen */
  goToReview: (amount: number, token: TokenAsset) => void;
  /** Navigate to processing screen with initial steps */
  goToProcessing: (
    amount: number,
    token: TokenAsset,
    steps: TransactionStep[],
  ) => void;
  /** Update processing steps during execution */
  updateProcessingSteps: (update: ExecutionUpdate) => void;
  /** Tracked transaction data */
  trackedTransaction: Transaction | null;
  /** Submit tracked transaction with tx hash */
  submitTrackedTransaction: (txHash: string) => void;
  /** Checkout ID for transaction updates */
  checkoutId: string;
  /** Navigate to exchange whitelisting screen */
  goToExchangeWhitelisting?: (walletAddress: string, amount?: number) => void;
  /** Resolve destination address for exchange transfers */
  resolveDestinationAddress?: () => Promise<string | null>;
}

interface UsePaymentActionsReturn {
  /** Whether an exchange operation is loading */
  isLoading: boolean;
  /** Whether an exchange transfer is executing */
  isExecuting: boolean;
  /** Error message (exchange) */
  error: string | null;
  /** Clear current error */
  clearError: () => void;
  /** Reset payment state */
  reset: () => void;
  /** Handle token selection from asset screen */
  handleTokenSelect: (token: TokenAsset) => Promise<void>;
  /** Handle payment confirmation from review screen (exchange-only) */
  handleConfirmPayment: (currentScreen: {
    type: "review";
    amount: number;
    token: TokenAsset;
  }) => Promise<void>;
  /** Get recipient address (resolves embedded wallet if needed) */
  getRecipientAddress: (fallbackAddress: string) => Promise<string>;
  /** Cached embedded wallet address */
  embeddedWalletAddress: string | null;
}

// =============================================================================
// HOOK
// =============================================================================

export function usePaymentActions(
  options: UsePaymentActionsOptions,
): UsePaymentActionsReturn {
  const {
    config,
    activeExchangeKey,
    getCurrentAmount,
    goToReview,
    goToProcessing,
    updateProcessingSteps,
    trackedTransaction,
    submitTrackedTransaction,
    checkoutId,
    goToExchangeWhitelisting,
    resolveDestinationAddress,
  } = options;

  // Exchange-specific state
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const [isExchangeLoading, setIsExchangeLoading] = useState(false);

  const clearError = useCallback(() => {
    setExchangeError(null);
  }, []);
  const reset = useCallback(() => {
    setExchangeError(null);
    setIsExchangeLoading(false);
  }, []);

  // Embedded wallet address - state for reactivity, ref for deduplication
  const [embeddedWalletAddress, setEmbeddedWalletAddress] = useState<
    string | null
  >(null);
  const embeddedWalletRef = useRef<string | null>(null);

  // Track in-flight operations to prevent race conditions
  const operationRef = useRef<AbortController | null>(null);

  // Settlement chain type - defaults to "EVM"
  const settlementChainType: Chain = config.settlement?.chain ?? "EVM";

  // ===========================================================================
  // RECIPIENT ADDRESS RESOLUTION
  // ===========================================================================

  /**
   * Get the appropriate recipient address based on deposit destination.
   * For embedded deposits, lazily creates the embedded wallet on the settlement chain.
   */
  const getRecipientAddress = useCallback(
    async (fallbackAddress: string): Promise<string> => {
      // For non-embedded destinations, use configured recipient address
      if (config.depositDestination !== "embedded") {
        if (!config.recipientAddress) return fallbackAddress;
        return config.recipientAddress;
      }

      // For embedded destinations, return cached wallet if available
      if (embeddedWalletRef.current) return embeddedWalletRef.current;

      // Lazily ensure embedded wallet exists on settlement chain and cache the address
      try {
        const wallet = await ensureEmbeddedWallet(settlementChainType);
        if (wallet?.address) {
          embeddedWalletRef.current = wallet.address;
          setEmbeddedWalletAddress(wallet.address);
          return wallet.address;
        }
      } catch (error) {
        // Failed to prepare embedded wallet - fallback to provided address
      }

      return fallbackAddress;
    },
    [config.depositDestination, config.recipientAddress, settlementChainType],
  );

  // ===========================================================================
  // PAYMENT EXECUTION (delegated — Kraken only; wallet path runs in PaymentWidget)
  // ===========================================================================

  const { handleConfirmPayment } = usePaymentExecution({
    config,
    activeExchangeKey,
    getRecipientAddress,
    goToProcessing,
    updateProcessingSteps,
    trackedTransaction,
    submitTrackedTransaction,
    checkoutId,
    onExchangeError: setExchangeError,
  });

  // ===========================================================================
  // TOKEN SELECTION HANDLER
  // ===========================================================================

  /**
   * Handle token selection.
   *
   * Exchange tokens: check whitelisting (route to whitelist screen if needed),
   * otherwise navigate straight to review.
   *
   * Wallet tokens: pre-switch the chain + pre-resolve the embedded wallet
   * address (UX nicety so PaymentWidget renders with a usable
   * `destinationAddress` and a ready-to-sign network), then navigate to
   * review where `<PaymentWidget />` mounts and owns the rest of the flow.
   */
  const handleTokenSelect = useCallback(
    async (token: TokenAsset) => {
      // Cancel any in-flight operation to prevent race conditions
      operationRef.current?.abort();
      const abortController = new AbortController();
      operationRef.current = abortController;

      // Clear any leftover errors from previous operations
      setExchangeError(null);

      const paymentAmount = getCurrentAmount();

      if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
        return;
      }

      // =================================================================
      // EXCHANGE TOKEN PATH — go straight to review (no Checkout Flow)
      // =================================================================
      if (isExchangeToken(token)) {
        const exchange = getActiveExchangeAdapter(activeExchangeKey);
        if (!exchange) return;

        // Check whitelisting for this specific address + token
        if (resolveDestinationAddress && goToExchangeWhitelisting) {
          setIsExchangeLoading(true);
          try {
            const walletAddress = await resolveDestinationAddress();
            if (walletAddress) {
              const { required, isWhitelisted } =
                await exchange.adapter.checkWhitelisting(
                  walletAddress,
                  token.symbol,
                );
              if (required && !isWhitelisted) {
                setIsExchangeLoading(false);
                goToExchangeWhitelisting(walletAddress, paymentAmount);
                return;
              }
            }
          } catch (err) {
            console.error("[PaymentActions] Whitelisting check failed:", err);
          } finally {
            setIsExchangeLoading(false);
          }
        }

        if (!abortController.signal.aborted) {
          goToReview(paymentAmount, token);
        }
        return;
      }

      // =================================================================
      // WALLET TOKEN PATH — delegated to <PaymentWidget />
      // =================================================================
      const primaryWallet = getPrimaryWalletAccount();
      if (!primaryWallet?.address) return;

      // Pre-switch the chain so the user doesn't see a "wrong network"
      // toast when PaymentWidget calls submit. UX nicety only.
      const { networkId: activeNetworkId } = await getActiveNetworkId({
        walletAccount: primaryWallet,
      });
      const requiredChainId = token.chainId.toString();

      if (activeNetworkId !== requiredChainId) {
        try {
          await switchActiveNetwork({
            walletAccount: primaryWallet,
            networkId: requiredChainId,
          });
        } catch {
          return; // User rejected or wallet doesn't support
        }
      }

      if (abortController.signal.aborted) return;

      // Pre-resolve embedded-wallet address so PaymentWidget receives a
      // ready destinationAddress synchronously at render time.
      if (config.depositDestination === "embedded") {
        await getRecipientAddress(primaryWallet.address);
      }

      if (abortController.signal.aborted) return;

      goToReview(paymentAmount, token);
    },
    [
      config,
      activeExchangeKey,
      getCurrentAmount,
      getRecipientAddress,
      goToReview,
      goToExchangeWhitelisting,
      resolveDestinationAddress,
    ],
  );

  return {
    isLoading: isExchangeLoading,
    isExecuting: false,
    error: exchangeError,
    clearError,
    reset,
    handleTokenSelect,
    handleConfirmPayment,
    getRecipientAddress,
    embeddedWalletAddress,
  };
}
