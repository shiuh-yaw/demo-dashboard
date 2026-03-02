/**
 * Transaction Lifecycle Hook
 *
 * Manages the complete transaction lifecycle from initialization to completion.
 * Integrates with realtime updates for instant status changes.
 */

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type {
  Transaction,
  TransactionStatus,
  InitializeTransactionParams,
  UpdateTransactionParams,
} from "@/lib/types";
import {
  initializeTransaction,
  updateTransaction,
  submitTransaction,
} from "@/lib/api/transactions";

/** Transaction hook state */
export interface UseTransactionState {
  /** Current transaction (null if not initialized) */
  transaction: Transaction | null;
  /** Current status for UI display */
  status: TransactionStatus | "idle";
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
}

/** Transaction hook actions */
export interface UseTransactionActions {
  /** Initialize a new transaction */
  initialize: (
    params?: InitializeTransactionParams,
  ) => Promise<Transaction | null>;
  /** Update transaction with route data */
  update: (params: UpdateTransactionParams) => Promise<Transaction | null>;
  /** Submit transaction with tx hash */
  submit: (txHash: string) => Promise<Transaction | null>;
  /** Reset to initial state */
  reset: () => void;
}

/** Combined hook return type */
export type UseTransactionReturn = UseTransactionState & UseTransactionActions;

/** Hook options */
export interface UseTransactionOptions {
  /** Checkout ID for the transaction */
  checkoutId: string;
  /** Initial transaction params from URL (externalId, metadata) */
  initialParams?: InitializeTransactionParams;
  /** Initial transaction if one already exists (server-side fetched) */
  initialTransaction?: Transaction | null;
  /** Auto-initialize on mount */
  autoInitialize?: boolean;
}

/**
 * Hook for managing transaction lifecycle
 *
 * @example
 * ```tsx
 * const { transaction, status, initialize, update, submit } = useTransaction({
 *   checkoutId: "abc123",
 *   initialParams: { externalId: "order-456" },
 *   autoInitialize: true,
 * });
 *
 * // When user selects a quote
 * await update({ walletAddress, fromChainId, ... });
 *
 * // When user confirms and tx is sent
 * await submit(txHash);
 * ```
 */
export function useTransaction(
  options: UseTransactionOptions,
): UseTransactionReturn {
  const {
    checkoutId,
    initialParams,
    initialTransaction = null,
    autoInitialize = false,
  } = options;

  const [transaction, setTransaction] = useState<Transaction | null>(
    initialTransaction,
  );
  const [status, setStatus] = useState<TransactionStatus | "idle">(
    initialTransaction?.status || "idle",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * Initialize a new transaction
   */
  const initialize = useCallback(
    async (
      params?: InitializeTransactionParams,
    ): Promise<Transaction | null> => {
      setIsLoading(true);
      setError(null);

      const result = await initializeTransaction(
        checkoutId,
        params || initialParams || {},
      );

      if (!mountedRef.current) {
        console.warn(
          "[useTransaction] Component unmounted, ignoring initialization result",
        );
        return null;
      }

      if (result.error) {
        console.error("[useTransaction] Initialize error:", result.error);
        setError(result.error);
        setIsLoading(false);
        return null;
      }

      if (result.data) {
        setTransaction(result.data);
        setStatus(result.data.status);

        setIsLoading(false);
        return result.data;
      }

      console.warn("[useTransaction] No data in initialize response");
      setIsLoading(false);
      return null;
    },
    [checkoutId, initialParams],
  );

  /**
   * Update transaction with route data
   */
  const update = useCallback(
    async (params: UpdateTransactionParams): Promise<Transaction | null> => {
      if (!transaction) {
        setError("No transaction to update");
        return null;
      }

      setIsLoading(true);
      setError(null);

      const result = await updateTransaction(
        checkoutId,
        transaction.id,
        params,
      );

      if (!mountedRef.current) return null;

      if (result.error) {
        setError(result.error);
        setIsLoading(false);
        return null;
      }

      if (result.data) {
        setTransaction(result.data);
        setStatus(result.data.status);
        setIsLoading(false);
        return result.data;
      }

      setIsLoading(false);
      return null;
    },
    [checkoutId, transaction],
  );

  /**
   * Submit transaction with tx hash
   */
  const submit = useCallback(
    async (txHash: string): Promise<Transaction | null> => {
      if (!transaction) {
        setError("No transaction to submit");
        return null;
      }

      setIsLoading(true);
      setError(null);

      const result = await submitTransaction(
        checkoutId,
        transaction.id,
        txHash,
      );

      if (!mountedRef.current) return null;

      if (result.error) {
        setError(result.error);
        setIsLoading(false);
        return null;
      }

      if (result.data) {
        setTransaction(result.data);
        setStatus(result.data.status);
        setIsLoading(false);
        return result.data;
      }

      setIsLoading(false);
      return null;
    },
    [checkoutId, transaction],
  );

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    setTransaction(null);
    setStatus("idle");
    setError(null);
    setIsLoading(false);
  }, []);

  // Auto-initialize on mount if requested
  useEffect(() => {
    if (autoInitialize && !transaction) initialize();
  }, [autoInitialize, initialize, transaction]);

  return {
    transaction,
    status,
    isLoading,
    error,
    initialize,
    update,
    submit,
    reset,
  };
}
