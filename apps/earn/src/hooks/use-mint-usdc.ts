"use client";

import { useCallback } from "react";
import {
  DYNAMIC_USDC_ABI,
  getDynamicUsdcAddress,
  DEFAULT_CHAIN_ID,
} from "@/lib/contracts";
import { encodeFunctionData, parseEther } from "viem";
import {
  useZeroDevTransaction,
  type UseZeroDevTransactionOptions,
} from "./use-zerodev-transaction";

/** Max mint amount (demo payout values are < 500; allow up to 10k for displayed "available to request"). */
const MAX_MINT_DOLLARS = 10_000;

/**
 * Dynamic USDC testnet contract expects whole dollars as uint256 (not 6-decimal units).
 * We round so we never pass a float to BigInt; fractional dollars are rounded down for the mint call.
 */
function dollarsToWholeUnit(dollars: number): bigint {
  return BigInt(Math.floor(dollars));
}

/**
 * Options for minting USDC
 */
interface MintOptions {
  /** Amount in dollars to mint (displayed "available to request" when using Get paid) */
  amountDollars: number;
  /** Chain ID where to mint (defaults to Base Sepolia) */
  chainId?: string;
}

/**
 * Hook for minting Dynamic USDC (testnet USDC) with ZeroDev gasless transactions.
 *
 * createKernelClientForWalletAccount requires the ZeroDev smart wallet account,
 * not the embedded EOA. We use getZerodevSmartWalletAccount() for the mint.
 *
 * @see https://www.dynamic.xyz/docs/javascript/reference/zerodev/create-kernel-client-for-wallet-account
 *
 * @example
 * ```tsx
 * const { isPending, txHash, mintUsdc, reset } = useMintUsdc({
 *   onSuccess: () => console.log("Minted!"),
 *   onError: (error) => console.error(error),
 * });
 * await mintUsdc({ amountDollars: 50 });
 * ```
 */
export function useMintUsdc(options?: UseZeroDevTransactionOptions) {
  const { isPending, txHash, error, initializeAndExecute, reset } =
    useZeroDevTransaction(options);

  const mintUsdc = useCallback(
    async (mintOptions: MintOptions) => {
      const { amountDollars, chainId = DEFAULT_CHAIN_ID } = mintOptions;

      // Validate amount
      if (amountDollars <= 0 || amountDollars > MAX_MINT_DOLLARS) {
        throw new Error(
          `Amount must be between 1 and ${MAX_MINT_DOLLARS.toLocaleString()} dollars`,
        );
      }

      // Get contract address for the chain
      const usdcAddress = getDynamicUsdcAddress(chainId);
      if (!usdcAddress) {
        throw new Error(
          `Dynamic USDC contract not available on chain ${chainId}`,
        );
      }

      // Convert to whole units
      const amountWhole = dollarsToWholeUnit(amountDollars);
      if (amountWhole === BigInt(0)) {
        throw new Error(
          "Amount too small. Mint at least 1 dollar (whole dollars only).",
        );
      }

      return initializeAndExecute(async (kernelClient) => {
        // Encode the mint function call
        const callData = encodeFunctionData({
          abi: DYNAMIC_USDC_ABI,
          functionName: "mint",
          args: [amountWhole],
        });

        // Send transaction using ZeroDev Kernel client (account abstraction)
        const hash = await kernelClient.sendTransaction({
          to: usdcAddress,
          data: callData,
          value: parseEther("0"),
        });

        return hash;
      });
    },
    [initializeAndExecute],
  );

  return {
    isPending,
    txHash,
    error,
    mintUsdc,
    reset,
  };
}
