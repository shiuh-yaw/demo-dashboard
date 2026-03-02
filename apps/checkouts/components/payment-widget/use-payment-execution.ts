"use client";

/**
 * Payment Execution Hook
 *
 * Handles the actual execution of payments after user confirmation.
 * Manages both exchange transfers and wallet-based transfers/swaps,
 * including execution state tracking and backend notifications.
 *
 * Separated from use-payment-actions.ts (which handles token selection
 * and quote fetching) for single-responsibility.
 *
 * @module components/payment-widget/use-payment-execution
 */

import { useCallback, useRef, useEffect } from "react";
import { getPrimaryWalletAccount } from "@/lib/dynamicClient";
import type { ExecutionUpdate } from "@/hooks/use-lifi";
import type {
  ExecuteSwapOptions,
  DirectTransferParams,
  SolanaTransferParams,
  SwapParams,
} from "@/hooks/use-lifi";
import { cancelTransaction, failTransaction } from "@/lib/api/transactions";
import { getActiveExchangeAdapter } from "@/lib/exchanges";
import {
  type WidgetConfig,
  toLiFiChainId,
  isSolanaChainId,
  toRawSettlementAmount,
} from "@/lib/widget-config";
import { isExchangeToken, type TokenAsset } from "@/lib/balance-utils";
import type { QuoteResult } from "@/lib/actions/lifi";
import type { Transaction } from "@/lib/types";
import type { TransactionStep } from "@/components/payment-modal/transaction-progress-screen";
import { generateTransactionSteps } from "@/components/payment-modal/transaction-progress-screen";
import { needsTokenConversion, getTokenAddress } from "./utils";

// =============================================================================
// TYPES
// =============================================================================

/** LI.FI functions passed from the orchestrator (usePaymentActions) */
export interface LiFiFunctions {
  quote: QuoteResult | null;
  executeSwap: (options?: ExecuteSwapOptions) => Promise<boolean>;
  executeDirectTransfer: (
    params: DirectTransferParams,
    options?: ExecuteSwapOptions,
  ) => Promise<boolean>;
  executeSolanaTransfer: (
    params: SolanaTransferParams,
    options?: ExecuteSwapOptions,
  ) => Promise<boolean>;
  getTransactionQuote: (
    checkoutId: string,
    transactionId: string,
    params: SwapParams,
  ) => Promise<QuoteResult | null>;
}

export interface UsePaymentExecutionOptions {
  /** Widget configuration */
  config: WidgetConfig;
  /** Active exchange key (null = wallet mode) */
  activeExchangeKey?: string | null;
  /** LI.FI functions from the orchestrator */
  lifi: LiFiFunctions;
  /** Resolve recipient address for transfers */
  getRecipientAddress: (fallbackAddress: string) => Promise<string>;
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
  /** Report exchange errors to the orchestrator */
  onExchangeError: (msg: string | null) => void;
}

export interface UsePaymentExecutionReturn {
  /** Handle payment confirmation from review screen */
  handleConfirmPayment: (currentScreen: {
    type: "review";
    amount: number;
    token: TokenAsset;
  }) => Promise<void>;
}

// =============================================================================
// HOOK
// =============================================================================

export function usePaymentExecution(
  options: UsePaymentExecutionOptions,
): UsePaymentExecutionReturn {
  const {
    config,
    activeExchangeKey,
    lifi,
    getRecipientAddress,
    goToProcessing,
    updateProcessingSteps,
    trackedTransaction,
    submitTrackedTransaction,
    checkoutId,
    onExchangeError,
  } = options;

  // Execution state - consolidated tracking for current payment execution
  const executionRef = useRef({
    transactionId: null as string | null,
    submitted: false, // Backend notified of txHash
    failureHandled: false, // Failure status sent to backend
    userRejected: false, // User explicitly rejected in wallet
    hasTxHash: false, // Received at least one txHash
  });

  // Reset execution state when transaction changes
  useEffect(() => {
    const currentId = trackedTransaction?.id ?? null;
    if (currentId !== executionRef.current.transactionId) {
      executionRef.current = {
        transactionId: currentId,
        submitted: false,
        failureHandled: false,
        userRejected: false,
        hasTxHash: false,
      };
    }
  }, [trackedTransaction?.id]);

  // ===========================================================================
  // PAYMENT CONFIRMATION HANDLER
  // ===========================================================================

  /**
   * Handle payment confirmation - execute direct transfer or swap.
   */
  const handleConfirmPayment = useCallback(
    async (currentScreen: {
      type: "review";
      amount: number;
      token: TokenAsset;
    }) => {
      const { settlement } = config;
      const { token, amount } = currentScreen;

      // =================================================================
      // EXCHANGE TRANSFER PATH
      // =================================================================
      if (isExchangeToken(token) && settlement) {
        onExchangeError(null);

        const exchange = getActiveExchangeAdapter(activeExchangeKey);
        if (!exchange) return;
        const { adapter, key: exchangeKey } = exchange;

        // Generate a single-step processing view
        const initialSteps = generateTransactionSteps(
          config.mode,
          false,
          token.symbol,
          settlement.tokenSymbol || token.symbol,
        );
        if (initialSteps[0]) initialSteps[0].status = "active";
        goToProcessing(amount, token, initialSteps);

        try {
          // Resolve destination address
          const recipientAddress = await getRecipientAddress("");

          // Generate a UUID for idempotency key requirement
          const idempotencyKey = crypto.randomUUID();

          // Execute the exchange transfer
          const result = await adapter.createTransfer({
            to: recipientAddress,
            amount,
            currency: token.symbol,
            chainName: settlement.chain,
            networkId: String(settlement.chainId),
            idempotencyKey,
          });

          // Submit to backend with the exchange transfer ID
          const exchangeTxId = `exchange:${exchangeKey}:${result.transferId}`;
          if (trackedTransaction) {
            submitTrackedTransaction(exchangeTxId);
          }

          // Optimistic confirm — mark all steps as done
          updateProcessingSteps({
            stepIndex: initialSteps.length - 1,
            totalSteps: initialSteps.length,
            status: "DONE",
            processType: "RECEIVING",
          });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);

          // Check for MFA error
          const isMfaError =
            errorMessage.includes("mfa") ||
            errorMessage.includes("MFA") ||
            errorMessage.includes("authentication") ||
            errorMessage.includes("two-factor");

          if (isMfaError) {
            const mfaMessage =
              "MFA verification required. Please complete the transfer on Kraken directly or disable MFA for API withdrawals.";
            onExchangeError(mfaMessage);
            updateProcessingSteps({
              stepIndex: 0,
              totalSteps: initialSteps.length,
              status: "FAILED",
              processType: "TRANSFER",
            });
            if (trackedTransaction) {
              cancelTransaction(checkoutId, trackedTransaction.id).catch(
                () => {},
              );
            }
            return;
          }

          // General failure — surface error message and cancel transaction
          onExchangeError(errorMessage);
          updateProcessingSteps({
            stepIndex: 0,
            totalSteps: initialSteps.length,
            status: "FAILED",
            processType: "TRANSFER",
          });

          if (trackedTransaction) {
            cancelTransaction(checkoutId, trackedTransaction.id).catch(
              () => {},
            );
          }
        }
        return;
      }

      // =================================================================
      // WALLET TRANSFER/SWAP PATH
      // =================================================================
      const needsConversion = needsTokenConversion(token, settlement);

      const primaryWallet = getPrimaryWalletAccount();
      if (!primaryWallet?.address) return;

      const destinationSymbol = lifi.quote?.toToken.symbol || token.symbol;

      // Generate initial steps and navigate to processing
      const initialSteps = generateTransactionSteps(
        config.mode,
        false,
        token.symbol,
        destinationSymbol,
      );
      if (initialSteps[0]) initialSteps[0].status = "active";

      goToProcessing(amount, token, initialSteps);

      // Reset execution state for new payment
      const exec = executionRef.current;
      exec.submitted = false;
      exec.failureHandled = false;
      exec.userRejected = false;
      exec.hasTxHash = false;

      // Unified callback for execution updates
      const onUpdate = (update: ExecutionUpdate) => {
        // Track txHash receipt
        if (update.txHash) exec.hasTxHash = true;

        // Always update UI
        updateProcessingSteps(update);

        // Submit to backend on first txHash (once only)
        if (update.txHash && trackedTransaction && !exec.submitted) {
          exec.submitted = true;
          submitTrackedTransaction(update.txHash);
        }

        // Handle failure (once only)
        if (
          update.status === "FAILED" &&
          trackedTransaction &&
          !exec.failureHandled
        ) {
          exec.failureHandled = true;
          // Cancellation = user rejected OR no txHash ever received
          const isCancellation = exec.userRejected || !exec.hasTxHash;
          if (isCancellation) {
            cancelTransaction(checkoutId, trackedTransaction.id).catch(() => {
              exec.failureHandled = false; // Allow retry
            });
          } else {
            failTransaction(
              checkoutId,
              trackedTransaction.id,
              "Transaction failed",
            ).catch(() => {
              exec.failureHandled = false;
            });
          }
        }
      };

      // User rejected in wallet - trigger failure flow
      const onRejected = () => {
        exec.userRejected = true;
        onUpdate({
          stepIndex: 0,
          totalSteps: initialSteps.length,
          status: "FAILED",
          processType: needsConversion ? "SWAP" : "TRANSFER",
        });
      };

      // Direct transfer (no conversion needed)
      if (!needsConversion) {
        const transferAmount = amount.toFixed(6);
        const recipientAddress = await getRecipientAddress(
          primaryWallet.address,
        );
        const isSolana = isSolanaChainId(token.chainId);

        if (isSolana) {
          // Solana direct transfer (native SOL or SPL token)
          await lifi.executeSolanaTransfer(
            {
              tokenMint: token.tokenAddress || "", // Empty for native SOL
              tokenDecimals: token.decimals,
              amount: transferAmount,
              toAddress: recipientAddress,
            },
            { onUpdate, onRejected },
          );
        } else {
          // EVM direct transfer (ERC-20)
          await lifi.executeDirectTransfer(
            {
              tokenAddress: getTokenAddress(token),
              tokenDecimals: token.decimals,
              amount: transferAmount,
              toAddress: recipientAddress,
              chainId: token.chainId,
            },
            { onUpdate, onRejected },
          );
        }
        return;
      }

      // Conversion needed - use LI.FI swap
      if (!settlement) return;

      // Fetch quote if we don't have one
      if (!lifi.quote && trackedTransaction) {
        const recipientAddress = await getRecipientAddress(
          primaryWallet.address,
        );
        const rawToAmount = toRawSettlementAmount(amount, settlement.decimals);
        const quoteResult = await lifi.getTransactionQuote(
          checkoutId,
          trackedTransaction.id,
          {
            fromChainId: toLiFiChainId(token.chainId),
            toChainId: toLiFiChainId(settlement.chainId),
            fromTokenAddress: getTokenAddress(token),
            toTokenAddress: settlement.tokenAddress,
            toAmount: rawToAmount,
            fromAddress: primaryWallet.address,
            toAddress: recipientAddress,
          },
        );

        if (!quoteResult) return;
      }

      const swapSuccess = await lifi.executeSwap({ onUpdate, onRejected });

      // When executeSwap returns successfully, the SDK has completed the full execution
      // (including bridge monitoring for cross-chain). Mark all steps as complete.
      if (swapSuccess) {
        onUpdate({
          stepIndex: initialSteps.length - 1,
          totalSteps: initialSteps.length,
          status: "DONE",
          processType: "RECEIVING",
        });
      }
    },
    [
      config,
      activeExchangeKey,
      lifi,
      getRecipientAddress,
      updateProcessingSteps,
      goToProcessing,
      trackedTransaction,
      checkoutId,
      submitTrackedTransaction,
      onExchangeError,
    ],
  );

  return { handleConfirmPayment };
}
