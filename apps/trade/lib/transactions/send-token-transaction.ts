"use client";

import { parseUnits, encodeFunctionData, erc20Abi } from "viem";
import type { EvmWalletAccount, NetworkData } from "@/lib/dynamic";
import {
  createWalletClientForWalletAccount,
  switchActiveNetwork,
} from "@/lib/dynamic";

export interface SendTokenParams {
  walletAccount: EvmWalletAccount;
  tokenAddress: string;
  decimals: number;
  amount: string;
  recipient: string;
  networkData: NetworkData;
}

export async function sendTokenTransaction({
  walletAccount,
  tokenAddress,
  decimals,
  amount,
  recipient,
  networkData,
}: SendTokenParams): Promise<string> {
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [recipient as `0x${string}`, parseUnits(amount, decimals)],
  });

  const tx = {
    to: tokenAddress as `0x${string}`,
    data,
    value: BigInt(0),
  };

  await switchActiveNetwork({
    networkId: networkData.networkId,
    walletAccount,
  });

  const walletClient = await createWalletClientForWalletAccount({
    walletAccount,
  });

  return await walletClient.sendTransaction(tx);
}
