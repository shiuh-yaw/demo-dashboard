"use client";

/**
 * LI.FI Hook for Token Swaps
 *
 * Provides unified interface for cross-chain swaps using LI.FI SDK
 * with Dynamic wallet integration for both EVM and Solana chains.
 *
 * @module hooks/use-lifi
 */

import { useCallback, useState, useRef } from "react";
import { formatErrorMessage, isUserRejection } from "@/lib/format";
import { getTransactionQuote, type QuoteResult } from "@/lib/actions/lifi";
import type {
  GetRoutesParams,
  ExecutionStatus,
  ExecutionUpdate,
} from "@/lib/types";
import { isSolanaChainId } from "@/lib/widget-config";
import { executeRoute, createConfig, type Route as LiFiRoute } from "@lifi/sdk";
import { buildSolanaProvider } from "./solana";
import { buildEvmProvider } from "./evm";
import { configureLiFi } from "./utils";
import { executeDirectTransfer as executeDirectTransferImpl } from "./evm";
import { executeSolanaTransfer as executeSolanaTransferImpl } from "./solana";
import type { DirectTransferParams } from "./evm";
import type { SolanaTransferParams } from "./solana";

// =============================================================================
// TYPES
// =============================================================================

// Re-export types for consumers
export type { ExecutionStatus, ExecutionUpdate } from "@/lib/types";

/** Parameters for fetching a swap quote */
export type SwapParams = GetRoutesParams;

/** Options for swap execution */
export interface ExecuteSwapOptions {
  /** Callback for execution progress updates */
  onUpdate?: (update: ExecutionUpdate) => void;
  /** Callback when user rejects the transaction */
  onRejected?: () => void;
  /** Callback when an error occurs */
  onError?: () => void;
}

// Re-export types from separated modules
export type { DirectTransferParams } from "./evm";
export type { SolanaTransferParams } from "./solana";

/** Return type for useLiFi hook */
export interface UseLiFiReturn {
  quote: QuoteResult | null;
  isLoading: boolean;
  isExecuting: boolean;
  error: string | null;
  getTransactionQuote: (
    checkoutId: string,
    transactionId: string,
    params: SwapParams,
  ) => Promise<QuoteResult | null>;
  executeSwap: (options?: ExecuteSwapOptions) => Promise<boolean>;
  executeDirectTransfer: (
    params: DirectTransferParams,
    options?: ExecuteSwapOptions,
  ) => Promise<boolean>;
  executeSolanaTransfer: (
    params: SolanaTransferParams,
    options?: ExecuteSwapOptions,
  ) => Promise<boolean>;
  clearError: () => void;
  reset: () => void;
}

// =============================================================================
// MAIN HOOK
// =============================================================================

/**
 * Hook for executing token swaps via LI.FI with Dynamic wallet integration.
 *
 * Supports:
 * - Cross-chain swaps (EVM ↔ EVM, Solana → EVM, EVM → Solana)
 * - Same-chain swaps
 * - Direct token transfers (EVM and Solana)
 *
 * IMPORTANT: All API calls (routes, status) go through the dashboard API.
 * The LI.FI SDK is ONLY used for swap execution (executeRoute).
 */
export function useLiFi(): UseLiFiReturn {
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Store the current route for execution
  const routeRef = useRef<QuoteResult | null>(null);

  /**
   * Fetch a swap quote for a transaction (fetches quote and stores route data atomically).
   * This is the preferred method when you have a transaction ID.
   * Does NOT use the LI.FI SDK - all API calls go through the dashboard.
   */
  const getTransactionQuoteFn = useCallback(
    async (
      checkoutId: string,
      transactionId: string,
      params: SwapParams,
    ): Promise<QuoteResult | null> => {
      setIsLoading(true);
      setError(null);
      setQuote(null);

      try {
        // Uses transaction-scoped quote endpoint (fetches quote + stores route data)
        const result = await getTransactionQuote(
          checkoutId,
          transactionId,
          params,
        );

        if (result.error) {
          setError(formatErrorMessage(result.error));
          return null;
        }

        if (result.data) {
          setQuote(result.data);
          routeRef.current = result.data;
          return result.data;
        }

        setError("Unable to get a quote. Please try again.");
        return null;
      } catch (err) {
        setError(formatErrorMessage(err));
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  /**
   * Execute a swap using the current quote.
   *
   * Uses LI.FI SDK (executeRoute) for swap execution.
   * Status updates are provided via updateRouteHook callback.
   */
  const executeSwap = useCallback(
    async (options?: ExecuteSwapOptions): Promise<boolean> => {
      const { onUpdate, onRejected, onError } = options || {};

      const currentQuote = routeRef.current;
      if (!currentQuote) {
        setError("No quote available. Get a quote first.");
        return false;
      }

      setIsExecuting(true);
      setError(null);

      const route = currentQuote.route;

      // Track if we've ever received a txHash (indicates transaction was submitted)
      // Declared outside try block so it's accessible in catch block
      let hasReceivedTxHash = false;

      try {
        // Validate route
        if (!route.steps?.length) {
          throw new Error("Invalid route: no steps found");
        }

        const isSolanaSource = isSolanaChainId(route.fromChainId);

        // Build appropriate provider based on source chain
        const providers: Parameters<typeof createConfig>[0]["providers"] = [];
        let rpcUrls: Record<number, string[]> | undefined;

        if (isSolanaSource) {
          const solanaConfig = await buildSolanaProvider(route.fromAddress);
          providers.push(solanaConfig.provider);
          rpcUrls = solanaConfig.rpcUrls;
        } else {
          providers.push(await buildEvmProvider());
        }

        // Configure LI.FI SDK for swap execution only
        // Integrator comes from dashboard API to ensure consistency
        configureLiFi(providers, {
          integrator: currentQuote.integrator,
          rpcUrls,
        });

        // Track source transaction for cross-chain polling
        let sourceTxHash: string | undefined;

        // Determine if this is a cross-chain transaction
        const isCrossChain = route.fromChainId !== route.toChainId;

        // Execute route using LI.FI SDK (this is the only SDK usage)
        await executeRoute(route as LiFiRoute, {
          updateRouteHook: (updatedRoute) => {
            if (!onUpdate) return;

            for (let i = 0; i < (updatedRoute.steps?.length || 0); i++) {
              const step = updatedRoute.steps?.[i];
              if (!step) continue;
              const execution = step.execution;

              if (!execution) continue;

              const process = execution.process || [];
              const processCount = process.length;

              for (let j = 0; j < processCount; j++) {
                const processItem = process[j];
                if (!processItem) continue;
                const status = processItem.status as ExecutionStatus;
                const processType =
                  processItem.type as ExecutionUpdate["processType"];

                // Track source txHash for cross-chain polling
                if (!sourceTxHash && processItem.txHash && i === 0 && j === 0) {
                  sourceTxHash = processItem.txHash;
                  hasReceivedTxHash = true;
                }

                // Track if we've ever received a txHash (indicates transaction was submitted)
                if (processItem.txHash) {
                  hasReceivedTxHash = true;
                }

                // Detect bridging phase: cross-chain CROSS_CHAIN process that's running
                const isBridging =
                  isCrossChain &&
                  processType === "CROSS_CHAIN" &&
                  status === "RUNNING";

                // Get LI.FI explorer link if available (may be on execution or process item)
                const lifiExplorerLink =
                  (execution as { lifiExplorerLink?: string })
                    .lifiExplorerLink ||
                  (processItem as { lifiExplorerLink?: string })
                    .lifiExplorerLink;

                onUpdate({
                  stepIndex: i,
                  totalSteps: updatedRoute.steps?.length ?? 0,
                  status,
                  txHash: processItem.txHash,
                  processType,
                  isCrossChain,
                  isBridging,
                  lifiExplorerLink,
                });
              }
            }
          },
        });

        // Note: For cross-chain transactions, additional polling is done
        // in usePaymentActions to detect bridge completion.

        setIsExecuting(false);
        return true;
      } catch (err) {
        setIsExecuting(false);

        const isRejection = isUserRejection(err);
        const errorMessage = err instanceof Error ? err.message : String(err);

        // If user rejection OR error without txHash (bundle expired/cancelled), treat as cancellation
        // If we got a txHash, it means transaction was submitted, so it's a real failure
        const isCancellation =
          isRejection ||
          (!hasReceivedTxHash && !errorMessage.includes("insufficient"));

        if (isCancellation) {
          onRejected?.();
          return false;
        }

        setError(formatErrorMessage(err));
        onError?.();
        return false;
      }
    },
    [],
  );

  /**
   * Execute a direct EVM token transfer (no swap needed)
   */
  const executeDirectTransfer = useCallback(
    async (
      params: DirectTransferParams,
      options?: ExecuteSwapOptions,
    ): Promise<boolean> => {
      return executeDirectTransferImpl(params, options);
    },
    [],
  );

  /**
   * Execute a direct Solana token transfer (no swap needed)
   */
  const executeSolanaTransfer = useCallback(
    async (
      params: SolanaTransferParams,
      options?: ExecuteSwapOptions,
    ): Promise<boolean> => {
      return executeSolanaTransferImpl(params, options);
    },
    [],
  );

  /**
   * Clear current error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Reset hook state (quote, error, loading)
   */
  const reset = useCallback(() => {
    setQuote(null);
    setError(null);
    setIsLoading(false);
    setIsExecuting(false);
    routeRef.current = null;
  }, []);

  return {
    quote,
    isLoading,
    isExecuting,
    error,
    getTransactionQuote: getTransactionQuoteFn,
    executeSwap,
    executeDirectTransfer,
    executeSolanaTransfer,
    clearError,
    reset,
  };
}
