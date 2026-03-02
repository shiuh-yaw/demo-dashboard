"use client";

import { useCallback } from "react";
import { getDynamicUsdcAddress, DEFAULT_CHAIN_ID } from "@/lib/contracts";
import { encodeFunctionData, parseEther, parseUnits, isAddress } from "viem";
import {
  useZeroDevTransaction,
  type UseZeroDevTransactionOptions,
} from "./use-zerodev-transaction";

const ERC20_TRANSFER_ABI = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

interface SendToWalletOptions {
  /** Recipient wallet address */
  toAddress: string;
  /** Amount in dollars to send (USDC has 6 decimals) */
  amountDollars: number;
  /** Chain ID (defaults to Base Sepolia) */
  chainId?: string;
}

/**
 * Hook for sending USDC to an external wallet with ZeroDev gasless transactions.
 * Used by Withdraw to Wallet flow.
 *
 * @example
 * ```tsx
 * const { isPending, sendToWallet, reset } = useSendToWallet({
 *   onSuccess: (hash) => console.log("Sent!", hash),
 *   onError: (error) => console.error(error),
 * });
 * await sendToWallet({ toAddress: "0x...", amountDollars: 50 });
 * ```
 */
export function useSendToWallet(options?: UseZeroDevTransactionOptions) {
  const { isPending, txHash, error, initializeAndExecute, reset } =
    useZeroDevTransaction(options);

  const sendToWallet = useCallback(
    async (sendOptions: SendToWalletOptions) => {
      const { toAddress, amountDollars, chainId = DEFAULT_CHAIN_ID } = sendOptions;

      // Validate recipient address
      if (!toAddress || !isAddress(toAddress)) {
        throw new Error("Invalid recipient wallet address");
      }

      // Validate amount
      if (amountDollars <= 0) {
        throw new Error("Amount must be greater than 0");
      }

      // Get USDC contract address
      const usdcAddress = getDynamicUsdcAddress(chainId);
      if (!usdcAddress) {
        throw new Error(`USDC contract not available on chain ${chainId}`);
      }

      return initializeAndExecute(async (kernelClient) => {
        // Convert dollars to USDC units (6 decimals)
        const amountUnits = parseUnits(String(amountDollars), 6);

        // Encode ERC20 transfer
        const callData = encodeFunctionData({
          abi: ERC20_TRANSFER_ABI,
          functionName: "transfer",
          args: [toAddress as `0x${string}`, amountUnits],
        });

        // Send transaction
        const hash = await kernelClient.sendTransaction({
          to: usdcAddress,
          data: callData,
          value: parseEther("0"),
        });

        return hash;
      });
    },
    [initializeAndExecute]
  );

  return {
    isPending,
    txHash,
    error,
    sendToWallet,
    reset,
  };
}
