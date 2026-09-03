"use client";

/**
 * EVM transfers - the sponsored path (ZeroDev kernel client, EIP-7702) when
 * the environment sponsors Sepolia, the plain viem path otherwise.
 *
 * @see https://www.dynamic.xyz/docs/javascript/reference/evm/getting-viem-wallet-client
 * @see https://www.dynamic.xyz/docs/javascript/reference/zerodev/create-kernel-client-for-wallet-account
 */

import { createWalletClientForWalletAccount } from "@dynamic-labs-sdk/evm/viem";
import {
  createKernelClientForWalletAccount,
  isGasSponsorshipError,
  signEip7702Authorization,
} from "@dynamic-labs-sdk/zerodev";
import { createPublicClient, encodeFunctionData, erc20Abi, formatUnits, http, parseUnits } from "viem";
import { sepolia } from "viem/chains";
import { env } from "@/lib/env";
import { SEPOLIA_USDC } from "@/lib/backend/types";
import { getEmbeddedEvmWallet, getZerodevWalletFor, type EvmWalletAccount } from "./wallets";
import { isNetworkSponsored, switchToSepolia } from "./networks";

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(env.NEXT_PUBLIC_SEPOLIA_RPC_URL),
});

export async function readBalances(address: `0x${string}`): Promise<{ eth: number; usdc: number }> {
  const [eth, usdc] = await Promise.all([
    publicClient.getBalance({ address }),
    publicClient.readContract({ address: SEPOLIA_USDC, abi: erc20Abi, functionName: "balanceOf", args: [address] }),
  ]);
  return { eth: Number(formatUnits(eth, 18)), usdc: Number(formatUnits(usdc, 6)) };
}

/** EIP-7702 delegation shows up as code `0xef0100 || delegate` at the EOA. */
async function has7702Delegation(address: `0x${string}`): Promise<boolean> {
  const code = await publicClient.getCode({ address });
  return code?.startsWith("0xef0100") ?? false;
}

export interface SendUsdcResult {
  txHash: string;
  sponsored: boolean;
}

/**
 * Send USDC on Sepolia. Sponsored when the environment has ZeroDev gas
 * sponsorship on Sepolia (Enterprise tier, provisioned manually): the first
 * sponsored send also signs the 7702 authorization that upgrades the EOA.
 */
export async function sendUsdc(to: `0x${string}`, amount: number): Promise<SendUsdcResult> {
  const base = getEmbeddedEvmWallet();
  if (!base) throw new Error("No embedded EVM wallet in this session.");
  const network = await switchToSepolia(base);
  const tx = {
    to: SEPOLIA_USDC,
    data: encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [to, parseUnits(String(amount), 6)] }),
    value: BigInt(0),
  };

  const zerodev = getZerodevWalletFor(base.address);
  const sponsored = !!zerodev && isNetworkSponsored(network.networkId);
  if (sponsored && zerodev) {
    try {
      const eip7702Auth = (await has7702Delegation(base.address as `0x${string}`))
        ? undefined
        : await signEip7702Authorization({ smartWalletAccount: zerodev, networkId: network.networkId });
      const kernel = await createKernelClientForWalletAccount({ smartWalletAccount: zerodev, eip7702Auth });
      const txHash = await kernel.sendTransaction(tx);
      return { txHash, sponsored: true };
    } catch (e) {
      if (!isGasSponsorshipError(e)) throw e;
      // Sponsorship refused (policy, quota): fall through to the user-paid path so
      // the demo fails honestly on "no ETH" rather than on an opaque error.
    }
  }
  const walletClient = await createWalletClientForWalletAccount({ walletAccount: base as EvmWalletAccount });
  const txHash = await walletClient.sendTransaction(tx);
  return { txHash, sponsored: false };
}
