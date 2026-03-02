"use client";

import { useCallback } from "react";
import { getDynamicUsdcAddress, DEFAULT_CHAIN_ID } from "@/lib/contracts";
import { encodeFunctionData, parseEther, parseUnits } from "viem";
import {
  useZeroDevTransaction,
  type UseZeroDevTransactionOptions,
} from "./use-zerodev-transaction";

const BURN_ADDRESS = "0x000000000000000000000000000000000000dead" as const;
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

interface SendToDeadOptions {
  /** Amount in dollars to send (USDC has 6 decimals) */
  amountDollars: number;
  /** Chain ID (defaults to Base Sepolia) */
  chainId?: string;
}

/**
 * Hook for sending USDC to burn address (0xdead) with ZeroDev gasless transactions.
 * Used by Add Funds flow to "deposit" from creator balance to prepaid card.
 *
 * @example
 * ```tsx
 * const { isPending, sendToDead, reset } = useSendToDead({
 *   onSuccess: () => console.log("Sent!"),
 *   onError: (error) => console.error(error),
 * });
 * await sendToDead({ amountDollars: 50 });
 * ```
 */
export function useSendToDead(options?: UseZeroDevTransactionOptions) {
  const { isPending, txHash, error, initializeAndExecute, reset } =
    useZeroDevTransaction(options);

  const sendToDead = useCallback(
    async (sendOptions: SendToDeadOptions) => {
      const { amountDollars, chainId = DEFAULT_CHAIN_ID } = sendOptions;

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

        // Encode ERC20 transfer to burn address
        const callData = encodeFunctionData({
          abi: ERC20_TRANSFER_ABI,
          functionName: "transfer",
          args: [BURN_ADDRESS, amountUnits],
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
    sendToDead,
    reset,
  };
}
