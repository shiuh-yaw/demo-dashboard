"use client";

/**
 * Dynamic Checkout Flow lifecycle hook.
 *
 * Owns the create → attach → quote → submit → events → cancel lifecycle of a
 * single checkout transaction. Produces ExecutionUpdate payloads in the same
 * shape the existing payment-widget UI already consumes, so the screens and
 * step animations are unchanged.
 *
 * All SDK calls flow through ../checkout-flow (the SSR-safe wrapper).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createTransaction,
  attachWalletSource,
  getQuote,
  submit as sdkSubmit,
  cancel as sdkCancel,
  getTransaction,
  type CheckoutTransaction,
  type CheckoutTransactionCreateResponse,
} from "../checkout-flow";
import type {
  CreateCheckoutTransactionParams,
  WalletSourceParams,
} from "../checkout-flow";
import type { WalletAccount } from "@dynamic-labs-sdk/client";
import type { ExecutionUpdate } from "../lib/types";
import { mapTransactionToUpdate } from "../checkout-flow/status-map";
import { createCheckoutStorage } from "../checkout-flow/storage";
import { formatErrorMessage, isUserRejection } from "../lib/format";

const TERMINAL_EXECUTION_STATES = new Set([
  "cancelled",
  "expired",
  "failed",
]);
const TERMINAL_SETTLEMENT_STATES = new Set(["completed", "failed"]);

const isTerminal = (tx: CheckoutTransaction): boolean =>
  TERMINAL_EXECUTION_STATES.has(tx.executionState as string) ||
  TERMINAL_SETTLEMENT_STATES.has(tx.settlementState as string);

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export interface BeginCheckoutParams {
  amount: string;
  currency: string;
  /** Dynamic Checkout id (provisioned via the Dynamic REST API). Required by the backend even though the SDK type marks it optional. */
  checkoutId?: string;
  destinationAddresses: CreateCheckoutTransactionParams["destinationAddresses"];
  memo?: object;
  source: Omit<WalletSourceParams, "transactionId">;
  fromTokenAddress: string;
}

export interface BeginCheckoutResult {
  transactionId: string;
  transaction: CheckoutTransaction;
}

export interface SubmitParams {
  walletAccount: WalletAccount;
  needsConversion: boolean;
  totalSteps: number;
  isCrossChain: boolean;
  /** Called on every state transition during the lifecycle. */
  onUpdate: (update: ExecutionUpdate) => void;
  /**
   * Called when the user rejects the transaction in their wallet. The hook
   * does NOT emit a terminal `onUpdate` on rejection — the caller is
   * responsible for emitting its own FAILED update via `onUpdate` (mirrors
   * the existing payment-widget rejection pattern).
   */
  onRejected?: () => void;
  /** Called on non-rejection errors (network, SDK, etc.). The hook emits a FAILED `onUpdate` itself in this branch. */
  onError?: () => void;
}

export interface UseCheckoutFlowOptions {
  /** Namespace for localStorage persistence. Defaults to "default". Host apps that
   *  support multiple Dynamic environments should pass their environment id here so
   *  in-flight transactions don't bleed across environments. */
  storageNamespace?: string;
}

export interface UseCheckoutFlowReturn {
  /** Transaction id once created; null before create or after reset. */
  transactionId: string | null;
  /** Latest CheckoutTransaction snapshot (carries quote once fetched). */
  quote: CheckoutTransaction | null;
  /** Latest error message, or null. */
  error: string | null;
  /** Loading flag during begin / submit calls. */
  isLoading: boolean;
  /** Create → attach wallet → quote in one call. Returns null on error. */
  beginCheckout: (params: BeginCheckoutParams) => Promise<BeginCheckoutResult | null>;
  /** Submit the transaction and poll until terminal. Returns the final CheckoutTransaction on success, null on rejection / error. */
  submit: (params: SubmitParams) => Promise<CheckoutTransaction | null>;
  /** Cancel the in-flight transaction (non-fatal if already cancelled). */
  cancel: () => Promise<void>;
  /** Reset state (clear error, transactionId, quote). */
  reset: () => void;
}

export function useCheckoutFlow(
  options: UseCheckoutFlowOptions = {},
): UseCheckoutFlowReturn {
  const { storageNamespace = "default" } = options;
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [quote, setQuote] = useState<CheckoutTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const sessionTokenRef = useRef<string | null>(null);
  const currentStepIndexRef = useRef(0);

  // Per-namespace localStorage for the in-flight transactionId. Reloading the
  // widget restores the existing transaction via getCheckoutTransaction.
  const storage = useMemo(
    () => createCheckoutStorage(storageNamespace),
    [storageNamespace],
  );

  // Restore an in-flight transaction on mount (no-op if storage is empty or
  // the persisted transaction is no longer retrievable).
  useEffect(() => {
    const persisted = storage.get();
    if (!persisted) return;
    let cancelled = false;
    (async () => {
      try {
        const tx = await getTransaction({ transactionId: persisted.transactionId });
        if (cancelled) return;
        setTransactionId(tx.id);
        setQuote(tx);
      } catch {
        storage.clear();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storage]);

  const beginCheckout = useCallback(
    async (params: BeginCheckoutParams): Promise<BeginCheckoutResult | null> => {
      setError(null);
      setIsLoading(true);
      try {
        const created: CheckoutTransactionCreateResponse = await createTransaction({
          amount: params.amount,
          currency: params.currency,
          checkoutId: params.checkoutId,
          destinationAddresses: params.destinationAddresses,
          memo: params.memo,
        });
        sessionTokenRef.current = created.sessionToken;
        const txId = created.transaction.id;
        setTransactionId(txId);
        storage.set({ transactionId: txId });

        await attachWalletSource({
          transactionId: txId,
          fromAddress: params.source.fromAddress,
          fromChainId: params.source.fromChainId,
          fromChainName: params.source.fromChainName,
        });

        const quoted = await getQuote({
          transactionId: txId,
          fromTokenAddress: params.fromTokenAddress,
        });
        setQuote(quoted);

        return { transactionId: txId, transaction: quoted };
      } catch (err) {
        setError(formatErrorMessage(err));
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [storage],
  );

  const submit = useCallback(
    async (params: SubmitParams): Promise<CheckoutTransaction | null> => {
      const txId = transactionId;
      if (!txId) {
        setError("No transaction to submit");
        return null;
      }

      const {
        walletAccount,
        needsConversion,
        totalSteps,
        isCrossChain,
        onUpdate,
        onRejected,
        onError,
      } = params;

      setError(null);
      setIsLoading(true);
      currentStepIndexRef.current = 0;

      const ctx = { needsConversion, totalSteps, isCrossChain } as const;

      const handleSnapshot = (tx: CheckoutTransaction) => {
        const update = mapTransactionToUpdate(tx, {
          ...ctx,
          currentStepIndex: currentStepIndexRef.current,
        });
        currentStepIndexRef.current = update.stepIndex;
        onUpdate(update);
      };

      const swapProcessType: ExecutionUpdate["processType"] = needsConversion
        ? isCrossChain
          ? "CROSS_CHAIN"
          : "SWAP"
        : "TRANSFER";

      try {
        await sdkSubmit({
          transactionId: txId,
          walletAccount,
          onStepChange: (step) => {
            if (step === "approval") {
              onUpdate({
                stepIndex: 0,
                totalSteps,
                status: "ACTION_REQUIRED",
                processType: "TOKEN_ALLOWANCE",
              });
              currentStepIndexRef.current = 0;
            } else if (step === "transaction") {
              onUpdate({
                stepIndex: 0,
                totalSteps,
                status: "DONE",
                processType: "TOKEN_ALLOWANCE",
              });
              onUpdate({
                stepIndex: 1,
                totalSteps,
                status: "ACTION_REQUIRED",
                processType: swapProcessType,
              });
              currentStepIndexRef.current = 1;
            }
          },
        });

        // Post-submit settlement polling. The official Checkout Flow demo
        // (apps/checkout-demo) uses TanStack Query refetchInterval to do this.
        // We poll the same way without depending on Dynamic's Realtime feature
        // (which is gated per-env and 400s with "Realtime service is not
        // configured" when unavailable). Demo defaults to a 15s timeout, but
        // real cross-chain swaps via LI.FI orchestration commonly take 30–90s,
        // so we extend to 2 minutes; if the swap takes longer than that the UI
        // leaves the last polled state on screen rather than spinning forever.
        const POLL_INTERVAL_MS = 3000;
        const POLL_TIMEOUT_MS = 120000;
        const pollStart = Date.now();
        // Immediately reflect the post-broadcast snapshot so the UI advances
        // to RUNNING step 1 before the first interval tick.
        let latest = await getTransaction({ transactionId: txId });
        handleSnapshot(latest);
        while (!isTerminal(latest)) {
          if (Date.now() - pollStart >= POLL_TIMEOUT_MS) break;
          await delay(POLL_INTERVAL_MS);
          latest = await getTransaction({ transactionId: txId });
          handleSnapshot(latest);
        }
        if (isTerminal(latest)) {
          // Future reloads should start fresh, not restore a finished tx.
          storage.clear();
        } else {
          // Timed out without reaching terminal state — the tx is on-chain
          // but Dynamic hasn't confirmed settlement yet. Don't clear storage:
          // a refresh restores the transaction and resumes polling.
          console.warn(
            `[useCheckoutFlow] Settlement polling timed out after ${POLL_TIMEOUT_MS}ms`,
            { transactionId: txId, executionState: latest.executionState, settlementState: latest.settlementState },
          );
        }
        return latest;
      } catch (err) {
        if (isUserRejection(err)) {
          onRejected?.();
        } else {
          setError(formatErrorMessage(err));
          onError?.();
          onUpdate({
            stepIndex: currentStepIndexRef.current,
            totalSteps,
            status: "FAILED",
            processType: needsConversion ? "SWAP" : "TRANSFER",
          });
        }
        storage.clear();
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [transactionId, storage],
  );

  const cancel = useCallback(async (): Promise<void> => {
    if (!transactionId) return;
    try {
      await sdkCancel({ transactionId });
    } catch {
      // Cancel-of-cancelled is non-fatal — swallow.
    } finally {
      storage.clear();
    }
  }, [transactionId, storage]);

  const reset = useCallback(() => {
    setTransactionId(null);
    setQuote(null);
    setError(null);
    setIsLoading(false);
    sessionTokenRef.current = null;
    storage.clear();
  }, [storage]);

  return { transactionId, quote, error, isLoading, beginCheckout, submit, cancel, reset };
}
