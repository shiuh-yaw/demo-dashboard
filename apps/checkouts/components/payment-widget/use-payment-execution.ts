"use client";

/**
 * Payment Execution Hook
 *
 * Handles the actual execution of exchange (Kraken) transfers after user
 * confirmation. Wallet-token payments are owned by `<PaymentWidget />` from
 * `@dynamic-demos/checkouts-widget`; this hook no longer touches them.
 *
 * Separated from use-payment-actions.ts (which handles token selection
 * and orchestration) for single-responsibility.
 *
 * @module components/payment-widget/use-payment-execution
 */

import { useCallback } from "react";
import type { ExecutionUpdate } from "@/lib/types";
import { cancelTransaction } from "@/lib/api/transactions";
import { getActiveExchangeAdapter } from "@/lib/exchanges";
import { type WidgetConfig } from "@/lib/widget-config";
import { isExchangeToken, type TokenAsset } from "@dynamic-demos/checkouts-widget";
import type { Transaction } from "@/lib/types";
import {
  type TransactionStep,
  generateTransactionSteps,
} from "@dynamic-demos/checkouts-widget";

// =============================================================================
// TYPES
// =============================================================================

export interface UsePaymentExecutionOptions {
  /** Widget configuration */
  config: WidgetConfig;
  /** Active exchange key (null = wallet mode) */
  activeExchangeKey?: string | null;
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
  /** Handle payment confirmation from review screen (exchange-only) */
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
    getRecipientAddress,
    goToProcessing,
    updateProcessingSteps,
    trackedTransaction,
    submitTrackedTransaction,
    checkoutId,
    onExchangeError,
  } = options;

  // ===========================================================================
  // PAYMENT CONFIRMATION HANDLER (exchange-only)
  // ===========================================================================

  /**
   * Handle payment confirmation for the exchange (Kraken) path.
   * Wallet payments are routed through `<PaymentWidget />` and don't go
   * through this handler.
   */
  const handleConfirmPayment = useCallback(
    async (currentScreen: {
      type: "review";
      amount: number;
      token: TokenAsset;
    }) => {
      const { settlement } = config;
      const { token, amount } = currentScreen;

      // Wallet tokens are handled by <PaymentWidget /> directly.
      if (!isExchangeToken(token) || !settlement) return;

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
          cancelTransaction(checkoutId, trackedTransaction.id).catch(() => {});
        }
      }
    },
    [
      config,
      activeExchangeKey,
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
