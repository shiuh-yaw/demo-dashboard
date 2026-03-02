/**
 * EVM-specific LI.FI integration functions
 *
 * Handles EVM provider configuration and direct token transfers
 * for LI.FI swaps.
 */

import { ERC20_TRANSFER_ABI } from "@/lib/config";
import { isUserRejection } from "@/lib/format";
import {
  requireEvmWallet,
  switchActiveNetwork,
  getEnabledNetworkIds,
} from "@/lib/dynamicClient";
import { createWalletClientForWalletAccount } from "@dynamic-labs-sdk/evm/viem";
import { EVM } from "@lifi/sdk";
import type { ExecuteSwapOptions } from "./index";

/**
 * Build EVM provider configuration for LI.FI SDK.
 *
 * @returns EVM provider with chain switching support
 */
export async function buildEvmProvider(): Promise<ReturnType<typeof EVM>> {
  const wallet = requireEvmWallet();
  const walletClient = await createWalletClientForWalletAccount({
    walletAccount: wallet,
  });

  return EVM({
    getWalletClient: async () => walletClient as any,
    switchChain: async (chainId: number) => {
      // Check if chain is enabled in Dynamic SDK configuration
      const enabledNetworkIds = getEnabledNetworkIds("EVM");
      if (!enabledNetworkIds.includes(chainId)) {
        throw new Error(
          `Chain ${chainId} is not enabled in Dynamic SDK configuration`,
        );
      }
      await switchActiveNetwork({
        walletAccount: wallet,
        networkId: chainId.toString(),
      });
      const newClient = await createWalletClientForWalletAccount({
        walletAccount: wallet,
      });
      return newClient as any;
    },
  });
}

/**
 * Parameters for direct EVM token transfer
 */
export interface DirectTransferParams {
  tokenAddress: string;
  tokenDecimals: number;
  /** Human-readable amount (e.g., "0.5") */
  amount: string;
  toAddress: string;
  chainId: number;
}

/**
 * Execute a direct ERC-20 token transfer (no swap needed).
 * Used when source and destination tokens are identical.
 */
export async function executeDirectTransfer(
  params: DirectTransferParams,
  options?: ExecuteSwapOptions,
): Promise<boolean> {
  const { onUpdate, onRejected, onError } = options || {};
  const { tokenAddress, tokenDecimals, amount, toAddress, chainId } = params;

  try {
    const wallet = requireEvmWallet();

    onUpdate?.({
      stepIndex: 0,
      totalSteps: 1,
      processType: "TRANSFER",
      status: "ACTION_REQUIRED",
    });

    const walletClient = await createWalletClientForWalletAccount({
      walletAccount: wallet,
    });

    // Switch chain if needed
    const currentChainId = await walletClient.getChainId();
    if (currentChainId !== chainId) {
      await switchActiveNetwork({
        walletAccount: wallet,
        networkId: chainId.toString(),
      });
    }

    // Convert to smallest unit
    const amountInWei = BigInt(
      Math.floor(parseFloat(amount) * Math.pow(10, tokenDecimals)),
    );

    onUpdate?.({
      stepIndex: 0,
      totalSteps: 1,
      processType: "TRANSFER",
      status: "RUNNING",
    });

    // Execute transfer
    const hash = await walletClient.writeContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_TRANSFER_ABI,
      functionName: "transfer",
      args: [toAddress as `0x${string}`, amountInWei],
    });

    onUpdate?.({
      stepIndex: 0,
      totalSteps: 1,
      processType: "TRANSFER",
      status: "DONE",
      txHash: hash,
    });

    return true;
  } catch (err) {
    const isRejection = isUserRejection(err);

    if (isRejection) {
      onRejected?.();
      return false;
    }

    onError?.();
    onUpdate?.({
      stepIndex: 0,
      totalSteps: 1,
      processType: "TRANSFER",
      status: "FAILED",
    });

    return false;
  }
}
