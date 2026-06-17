"use client";

/**
 * Dynamic Checkout Flow lifecycle hook.
 *
 * Owns the create → attach → quote → submit → events → cancel lifecycle of a
 * single Flow (legacy name: checkout transaction). Produces ExecutionUpdate
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
import {
  extractFailureMessage,
  isFailedTerminal,
  mapTransactionToUpdate,
} from "../checkout-flow/status-map";
import { createCheckoutStorage } from "../checkout-flow/storage";
import { formatErrorMessage, isUserRejection } from "../lib/format";

const TERMINAL_EXECUTION_STATES = new Set(["cancelled", "expired", "failed"]);
const TERMINAL_SETTLEMENT_STATES = new Set(["completed", "failed"]);

const isTerminal = (tx: CheckoutTransaction): boolean =>
  TERMINAL_EXECUTION_STATES.has(tx.executionState as string) ||
  TERMINAL_SETTLEMENT_STATES.has(tx.settlementState as string);

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export interface BeginCheckoutParams {
  amount: string;
  currency: string;
  /**
   * Server-side Flow creation. Called at the start of `beginCheckout`
   * once amount is known. Must return the new `flowId`.
   */
  createFlow?: (params: {
    amount: string;
    currency: string;
  }) => Promise<string>;
  /** @deprecated Prefer {@link BeginCheckoutParams.createFlow}. Reusable Checkout config + client create. */
  checkoutId?: string;
  /**
   * Per-transaction destination override. Omit to fall back to the
   * destinations configured on the Checkout server-side (the common
   * case for merchant payments). When provided, the address must match
   * the Dynamic API's pattern (`^[A-Za-z0-9_]{18,100}$`); empty strings
   * are rejected by the backend, so undefined is the right way to skip.
   */
  destinationAddresses?: CreateCheckoutTransactionParams["destinationAddresses"];
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
  /**
   * Slippage tolerance forwarded to `getFlowQuote` on
   * every quote request (initial, quote-expired retry, and manual
   * refresh). Expressed as a decimal — `0.02` = 2%. Omit to let the
   * SDK apply its default.
   */
  slippage?: number;
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
  beginCheckout: (
    params: BeginCheckoutParams,
  ) => Promise<BeginCheckoutResult | null>;
  /** Submit the transaction and poll until terminal. Returns the final CheckoutTransaction on success, null on rejection / error. */
  submit: (params: SubmitParams) => Promise<CheckoutTransaction | null>;
  /**
   * Re-fetch the quote for the current transaction. Used immediately
   * before submit on Solana flows to refresh the server-baked
   * blockhash (Solana blockhashes expire in ~60–90s, and the user
   * lingering on the review screen can stale-out the initial quote's
   * `signingPayload.serializedTransaction`, surfacing as
   * "Transaction simulation failed: Blockhash not found" during
   * broadcast). Returns the fresh transaction or null on error.
   */
  refreshQuote: (fromTokenAddress: string) => Promise<CheckoutTransaction | null>;
  /** Cancel the in-flight transaction (non-fatal if already cancelled). */
  cancel: () => Promise<void>;
  /** Reset state (clear error, transactionId, quote). */
  reset: () => void;
}

export function useCheckoutFlow(
  options: UseCheckoutFlowOptions = {},
): UseCheckoutFlowReturn {
  const { storageNamespace = "default", slippage } = options;
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [quote, setQuote] = useState<CheckoutTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const sessionTokenRef = useRef<string | null>(null);
  const currentStepIndexRef = useRef(0);
  /** Source chain id from the last beginCheckout — used when re-quoting. */
  const sourceChainIdRef = useRef<string | null>(null);

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
        const tx = await getTransaction({
          transactionId: persisted.transactionId,
        });
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
    async (
      params: BeginCheckoutParams,
    ): Promise<BeginCheckoutResult | null> => {
      setError(null);
      setIsLoading(true);
      try {
        let txId: string;

        if (params.createFlow) {
          txId = await params.createFlow({
            amount: params.amount,
            currency: params.currency,
          });
        } else {
          const created: CheckoutTransactionCreateResponse =
            await createTransaction({
              amount: params.amount,
              currency: params.currency,
              checkoutId: params.checkoutId,
              destinationAddresses: params.destinationAddresses,
              memo: params.memo,
            });
          sessionTokenRef.current = created.sessionToken;
          txId = created.transaction.id;
        }

        sourceChainIdRef.current = params.source.fromChainId;
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
          fromChainId: params.source.fromChainId,
          ...(slippage !== undefined ? { slippage } : {}),
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
    [storage, slippage],
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

      const onStepChange = (step: "approval" | "transaction") => {
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
      };

      // Dynamic's Checkout quotes are short-lived (60s on the wire as of
      // 2026-05). If the user dwells on the review screen, the prepare
      // call inside sdkSubmit returns 422 "Quote has expired; request a
      // new quote before signing." Catch it once, refresh the quote
      // using the existing fromToken (held in widget state from the
      // initial getQuote), and retry. After one failed retry, surface
      // the error normally so the user sees the failure instead of an
      // infinite loop.
      const isQuoteExpiredError = (err: unknown): boolean => {
        const msg =
          err instanceof Error
            ? err.message
            : typeof err === "string"
              ? err
              : "";
        return /quote.*expired|expired.*quote/i.test(msg);
      };

      try {
        try {
          await sdkSubmit({
            transactionId: txId,
            walletAccount,
            onStepChange,
          });
        } catch (err) {
          if (!isQuoteExpiredError(err)) throw err;
          // Quote's stale — pull fromToken off the in-state quote and
          // request a fresh one before retrying. If the in-state quote
          // is missing or has no fromToken, rethrow the original error
          // (we have nothing to refresh against).
          const fromTokenAddress = quote?.fromToken;
          if (!fromTokenAddress) throw err;
          const fresh = await getQuote({
            transactionId: txId,
            fromTokenAddress,
            fromChainId: sourceChainIdRef.current ?? undefined,
            ...(slippage !== undefined ? { slippage } : {}),
          });
          setQuote(fresh);
          // Reset the step index — a refreshed quote means the user is
          // back at the "before submit" state, not partway through a
          // failed submit.
          currentStepIndexRef.current = 0;
          await sdkSubmit({
            transactionId: txId,
            walletAccount,
            onStepChange,
          });
        }

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
            {
              transactionId: txId,
              executionState: latest.executionState,
              settlementState: latest.settlementState,
            },
          );
        }
        // Polling reached a TERMINAL FAILURE (e.g. BRIDGE_FAILED reported
        // by Dynamic's backend, or executionState=expired/cancelled).
        // Without this branch we'd return the failed tx and the host
        // widget would call onSettlementCompleted on a tx that didn't
        // settle — that's the "we silently bounced back to the wallet
        // screen with no error" bug. Treat failed-terminal identically
        // to a thrown error: set flow.error, fire onError, emit a FAILED
        // ExecutionUpdate, and return null so the host's success
        // callback doesn't fire.
        if (isFailedTerminal(latest)) {
          setError(extractFailureMessage(latest));
          onError?.();
          onUpdate({
            stepIndex: currentStepIndexRef.current,
            totalSteps,
            status: "FAILED",
            processType: needsConversion ? "SWAP" : "TRANSFER",
          });
          return null;
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
    // quote is read inside the closure for the quote-expired retry path
    // — it holds the fromToken we re-quote against.
    [transactionId, storage, quote, slippage],
  );

  const refreshQuote = useCallback(
    async (fromTokenAddress: string): Promise<CheckoutTransaction | null> => {
      if (!transactionId) return null;
      try {
        const fresh = await getQuote({
          transactionId,
          fromTokenAddress,
          fromChainId: sourceChainIdRef.current ?? undefined,
          ...(slippage !== undefined ? { slippage } : {}),
        });
        setQuote(fresh);
        return fresh;
      } catch (err) {
        setError(formatErrorMessage(err));
        return null;
      }
    },
    [transactionId, slippage],
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
    sourceChainIdRef.current = null;
    storage.clear();
  }, [storage]);

  return {
    transactionId,
    quote,
    error,
    isLoading,
    beginCheckout,
    submit,
    refreshQuote,
    cancel,
    reset,
  };
}
