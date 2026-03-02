"use client";

import { useState, useCallback } from "react";
import {
  waitForClientInitialized,
  getZerodevSmartWalletAccount,
} from "@/lib/dynamic";
import {
  createKernelClientForWalletAccount,
  isGasSponsorshipError,
  type KernelClient,
} from "@dynamic-labs-sdk/zerodev";
import { isEvmWalletAccount } from "@dynamic-labs-sdk/evm";

/**
 * Result from initializing ZeroDev wallet
 */
interface ZeroDevInitResult {
  kernelClient: KernelClient;
  smartWalletAddress: `0x${string}`;
}

/**
 * Error types for ZeroDev operations
 */
export type ZeroDevError =
  | { type: "init_failed"; message: string }
  | { type: "wallet_not_found"; message: string }
  | { type: "not_evm_wallet"; message: string }
  | { type: "transaction_failed"; message: string };

/**
 * Base options for ZeroDev transaction hooks
 */
export interface UseZeroDevTransactionOptions<TResult = string> {
  /** Callback when transaction succeeds */
  onSuccess?: (result: TResult) => void;
  /** Callback when transaction fails */
  onError?: (error: Error) => void;
  /** Whether to fall back to non-sponsored tx if sponsorship fails (default: true) */
  fallbackOnSponsorshipError?: boolean;
}

/**
 * State returned by ZeroDev transaction hooks
 */
export interface ZeroDevTransactionState {
  isPending: boolean;
  txHash: string | null;
  error: Error | null;
}

/**
 * Hook that provides common ZeroDev initialization and transaction state management.
 *
 * This hook consolidates the duplicated ZeroDev wallet initialization logic that was
 * previously repeated across use-mint-usdc.ts, use-send-to-dead.ts, and use-send-to-wallet.ts.
 *
 * @example
 * ```tsx
 * const { state, initializeAndExecute, reset } = useZeroDevTransaction({
 *   onSuccess: () => console.log("Done!"),
 *   onError: (e) => console.error(e),
 * });
 *
 * await initializeAndExecute(async (kernelClient, address) => {
 *   // Your transaction logic here
 *   return await kernelClient.sendTransaction({ ... });
 * });
 * ```
 */
export function useZeroDevTransaction<TResult = string>(
  options?: UseZeroDevTransactionOptions<TResult>,
) {
  const [isPending, setIsPending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Initialize ZeroDev wallet and get Kernel client
   * @throws Error if initialization fails or wallet is not available
   */
  const initializeWallet = useCallback(async (): Promise<ZeroDevInitResult> => {
    // Wait for Dynamic client to be ready
    await waitForClientInitialized();

    // Get ZeroDev smart wallet account
    const smartWalletAccount = getZerodevSmartWalletAccount();
    if (!smartWalletAccount) {
      throw new Error(
        "ZeroDev smart wallet not found. Connect with your embedded wallet.",
      );
    }

    if (!isEvmWalletAccount(smartWalletAccount)) {
      throw new Error("Use an EVM wallet for this operation.");
    }

    // Create Kernel client with gas sponsorship
    const kernelClient = await createKernelClientForWalletAccount({
      smartWalletAccount,
      withSponsorship: true,
    });

    return {
      kernelClient,
      smartWalletAddress: smartWalletAccount.address as `0x${string}`,
    };
  }, []);

  /**
   * Initialize wallet and execute a transaction
   * Handles all state management (pending, error, success)
   *
   * If gas sponsorship fails and fallbackOnSponsorshipError is true (default),
   * will retry the transaction without sponsorship.
   */
  const initializeAndExecute = useCallback(
    async (
      executeFn: (
        kernelClient: KernelClient,
        smartWalletAddress: `0x${string}`,
      ) => Promise<TResult>,
    ): Promise<TResult> => {
      setIsPending(true);
      setError(null);
      setTxHash(null);

      const shouldFallback = options?.fallbackOnSponsorshipError ?? true;

      try {
        const { kernelClient, smartWalletAddress } = await initializeWallet();

        try {
          const result = await executeFn(kernelClient, smartWalletAddress);

          // If result is a string (tx hash), store it
          if (typeof result === "string") {
            setTxHash(result);
          }

          options?.onSuccess?.(result);
          return result;
        } catch (txError) {
          // If gas sponsorship failed and fallback is enabled, retry without sponsorship
          if (shouldFallback && isGasSponsorshipError(txError)) {
            console.log(
              "[ZeroDev] Gas sponsorship failed, retrying without sponsorship",
            );

            // Get wallet account again and create client without sponsorship
            const smartWalletAccount = getZerodevSmartWalletAccount();
            if (
              !smartWalletAccount ||
              !isEvmWalletAccount(smartWalletAccount)
            ) {
              throw txError;
            }

            const kernelClientNoSponsorship =
              await createKernelClientForWalletAccount({
                smartWalletAccount,
                withSponsorship: false,
              });

            const result = await executeFn(
              kernelClientNoSponsorship,
              smartWalletAddress,
            );

            if (typeof result === "string") {
              setTxHash(result);
            }

            options?.onSuccess?.(result);
            return result;
          }

          throw txError;
        }
      } catch (e: unknown) {
        const err = e instanceof Error ? e : new Error("Transaction failed");
        setError(err);
        options?.onError?.(err);
        throw err;
      } finally {
        setIsPending(false);
      }
    },
    [initializeWallet, options],
  );

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    setIsPending(false);
    setTxHash(null);
    setError(null);
  }, []);

  return {
    // State
    isPending,
    txHash,
    error,
    state: { isPending, txHash, error } as ZeroDevTransactionState,
    // Actions
    initializeWallet,
    initializeAndExecute,
    reset,
  };
}
