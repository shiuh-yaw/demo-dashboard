"use client";

/**
 * USDC Transaction Handler
 *
 * Specialized for USDC ERC-20 transfers on Base Sepolia.
 * Uses ZeroDev for gas-sponsored transactions when available.
 */

import { parseUnits, encodeFunctionData, erc20Abi } from "viem";
import {
  type EvmWalletAccount,
  type NetworkData,
  createWalletClientForWalletAccount,
  createKernelClientForWalletAccount,
  switchActiveNetwork,
} from "@/lib/dynamic";
import { USDC_CONTRACT_ADDRESS, USDC_DECIMALS } from "@/lib/constants";

export interface SendUsdcTransactionParams {
  walletAccount: EvmWalletAccount;
  amount: string;
  recipient: string;
  networkData: NetworkData;
}

/**
 * Send a USDC transfer on Base Sepolia.
 * Uses ZeroDev kernel client for gas sponsorship if the wallet is a ZeroDev wallet.
 * Falls back to viem wallet client for base wallets.
 *
 * @returns Transaction hash
 */
export async function sendUsdcTransaction({
  walletAccount,
  amount,
  recipient,
  networkData,
}: SendUsdcTransactionParams): Promise<string> {
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [
      recipient as `0x${string}`,
      parseUnits(amount, USDC_DECIMALS),
    ],
  });

  const tx = {
    to: USDC_CONTRACT_ADDRESS as `0x${string}`,
    data,
    value: BigInt(0),
  };

  // Ensure wallet is on correct network
  await switchActiveNetwork({
    networkId: networkData.networkId,
    walletAccount,
  });

  // ZeroDev wallet — use kernel client for gas sponsorship
  if (walletAccount.walletProviderKey.includes("zerodev")) {
    const kernelClient = await createKernelClientForWalletAccount({
      smartWalletAccount: walletAccount,
    });

    return await kernelClient.sendTransaction(tx);
  }

  // Base wallet — use viem wallet client
  const walletClient = await createWalletClientForWalletAccount({
    walletAccount,
  });
  return await walletClient.sendTransaction(tx);
}
