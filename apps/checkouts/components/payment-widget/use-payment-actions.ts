"use client";

/**
 * Payment Actions Hook
 *
 * Orchestrates token selection, quote fetching, and payment execution.
 * Owns the LI.FI hook instance and unified error/loading state.
 *
 * Architecture:
 * - Token selection + quote fetching: this file
 * - Recipient address resolution: this file
 * - Payment execution: ./use-payment-execution.ts
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
import { useLiFi, type ExecutionUpdate } from "@/hooks/use-lifi";
import {
  getActiveExchangeAdapter,
  resolveActiveExchangeKey,
} from "@/lib/exchanges";
import {
  type WidgetConfig,
  toRawSettlementAmount,
  toLiFiChainId,
} from "@/lib/widget-config";
import { isExchangeToken, type TokenAsset } from "@/lib/balance-utils";
import type { QuoteResult } from "@/lib/actions/lifi";
import type { Transaction } from "@/lib/types";
import type { TransactionStep } from "@/components/payment-modal/transaction-progress-screen";
import {
  needsTokenConversion,
  getTokenAddress,
  isImmutableQuoteStatus,
} from "./utils";
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
  /** LI.FI quote result */
  quote: QuoteResult | null;
  /** Whether a quote or exchange operation is loading */
  isLoading: boolean;
  /** Whether swap is executing */
  isExecuting: boolean;
  /** Error message (quote, swap, or exchange) */
  error: string | null;
  /** Clear current error */
  clearError: () => void;
  /** Reset payment state */
  reset: () => void;
  /** Handle token selection from asset screen */
  handleTokenSelect: (token: TokenAsset) => Promise<void>;
  /** Handle payment confirmation from review screen */
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

  // LI.FI swap/quote handling
  const {
    quote,
    isLoading: isQuoteLoading,
    isExecuting,
    error: lifiError,
    getTransactionQuote: getTransactionQuoteFromHook,
    executeSwap,
    executeDirectTransfer,
    executeSolanaTransfer,
    clearError: clearLifiError,
    reset: resetLifi,
  } = useLiFi();

  // Exchange-specific state
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const [isExchangeLoading, setIsExchangeLoading] = useState(false);

  // Combined error and reset for consumers (LI.FI or exchange)
  const error = exchangeError || lifiError;
  const clearError = useCallback(() => {
    setExchangeError(null);
    clearLifiError();
  }, [clearLifiError]);
  const reset = useCallback(() => {
    setExchangeError(null);
    setIsExchangeLoading(false);
    resetLifi();
  }, [resetLifi]);

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
  // PAYMENT EXECUTION (delegated)
  // ===========================================================================

  const { handleConfirmPayment } = usePaymentExecution({
    config,
    activeExchangeKey,
    lifi: {
      quote,
      executeSwap,
      executeDirectTransfer,
      executeSolanaTransfer,
      getTransactionQuote: getTransactionQuoteFromHook,
    },
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
   * Handle token selection - switch chain if needed, fetch quote, navigate to review.
   * Protected against race conditions from rapid successive calls.
   */
  const handleTokenSelect = useCallback(
    async (token: TokenAsset) => {
      // Cancel any in-flight operation to prevent race conditions
      operationRef.current?.abort();
      const abortController = new AbortController();
      operationRef.current = abortController;

      // Clear any leftover errors from previous operations
      setExchangeError(null);

      const { settlement } = config;
      const paymentAmount = getCurrentAmount();

      if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
        return;
      }

      // =================================================================
      // EXCHANGE TOKEN PATH — skip wallet/chain/LI.FI, go straight to review
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
      // WALLET TOKEN PATH
      // =================================================================
      const needsConversion = needsTokenConversion(token, settlement);

      const primaryWallet = getPrimaryWalletAccount();
      if (!primaryWallet?.address) {
        return;
      }

      // Switch to the token's chain if needed
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

      // Check if operation was cancelled
      if (abortController.signal.aborted) return;

      // Pre-fetch embedded wallet address for review screen display
      if (config.depositDestination === "embedded") {
        await getRecipientAddress(primaryWallet.address);
      }

      // If no conversion needed, go directly to review
      if (!needsConversion || !settlement) {
        if (!abortController.signal.aborted) {
          goToReview(paymentAmount, token);
        }
        return;
      }

      // Quote by toAmount: desired output in destination token (what the merchant receives).
      const rawToAmount = toRawSettlementAmount(
        paymentAmount,
        settlement.decimals,
      );

      // Fetch quote
      const recipientAddress = await getRecipientAddress(primaryWallet.address);

      // Check if operation was cancelled before making API call
      if (abortController.signal.aborted) return;

      const swapParams = {
        fromChainId: toLiFiChainId(token.chainId),
        toChainId: toLiFiChainId(settlement.chainId),
        fromTokenAddress: getTokenAddress(token),
        toTokenAddress: settlement.tokenAddress,
        toAmount: rawToAmount,
        fromAddress: primaryWallet.address,
        toAddress: recipientAddress,
      };

      // Always use transaction-scoped quote endpoint
      // Transactions are initialized on login, so we should always have one
      if (!trackedTransaction) {
        throw new Error(
          "Transaction not initialized. Please ensure you are logged in.",
        );
      }

      if (isImmutableQuoteStatus(trackedTransaction.status)) {
        throw new Error(
          `Cannot get quote for transaction with status "${trackedTransaction.status}". Transaction is already in progress or completed.`,
        );
      }

      // Use transaction-scoped quote endpoint (fetches quote AND stores route data atomically)
      // This also updates the quote state in useLiFi hook for UI consumption
      const quoteResult = await getTransactionQuoteFromHook(
        checkoutId,
        trackedTransaction.id,
        swapParams,
      );

      // Check if operation was cancelled after API call
      if (abortController.signal.aborted) return;

      if (quoteResult) {
        goToReview(paymentAmount, token);
      }
    },
    [
      config,
      activeExchangeKey,
      getCurrentAmount,
      getRecipientAddress,
      getTransactionQuoteFromHook,
      goToReview,
      goToExchangeWhitelisting,
      resolveDestinationAddress,
      trackedTransaction,
      checkoutId,
    ],
  );

  return {
    quote,
    isLoading: isQuoteLoading || isExchangeLoading,
    isExecuting,
    error,
    clearError,
    reset,
    handleTokenSelect,
    handleConfirmPayment,
    getRecipientAddress,
    embeddedWalletAddress,
  };
}
