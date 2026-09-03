"use client";

/**
 * EVM transfers. Three paths, tried in order:
 *
 *   1. Dynamic's native gas sponsorship - the 7702 relayer the brief names.
 *      One dashboard toggle, one call; the SDK signs the one-time EIP-7702
 *      delegation itself.
 *   2. ZeroDev account abstraction in 7702 mode, when the environment
 *      configures that provider for Sepolia instead.
 *   3. The plain viem wallet client - the user pays gas.
 *
 * @see https://www.dynamic.xyz/docs/javascript/reference/evm/evm-gas-sponsorship
 * @see https://www.dynamic.xyz/docs/javascript/reference/zerodev/create-kernel-client-for-wallet-account
 * @see https://www.dynamic.xyz/docs/javascript/reference/evm/getting-viem-wallet-client
 */

import { isEvmGasSponsorshipEnabled, sendSponsoredTransaction, SponsorTransactionError } from "@dynamic-labs-sdk/evm";
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
import { getSepoliaNetwork, isNetworkSponsored, switchToSepolia } from "./networks";

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

export interface SponsorshipDiagnostics {
  /** Dynamic's native EVM gas sponsorship (7702 relayer) is enabled on the environment. */
  nativeSponsorship: boolean;
  /** A ZeroDev smart-account wrapper exists for the embedded wallet (account abstraction enabled). */
  zerodevAccount: boolean;
  /** Sepolia is in the environment's sponsored-network list. */
  sepoliaSponsored: boolean;
  /** The SDK's id for Sepolia in this environment, when enabled. */
  networkId?: string;
}

/** Why beat 3 will or will not be sponsored, for the presenter rail. */
export function getSponsorshipDiagnostics(): SponsorshipDiagnostics {
  const base = getEmbeddedEvmWallet();
  const network = getSepoliaNetwork();
  return {
    nativeSponsorship: isEvmGasSponsorshipEnabled(),
    zerodevAccount: !!base && !!getZerodevWalletFor(base.address),
    sepoliaSponsored: !!network && isNetworkSponsored(network.networkId),
    networkId: network?.networkId,
  };
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

  // 1. Native relayer. autoDelegate signs the 7702 authorization on first use.
  let nativeFailure: string | undefined;
  if (isEvmGasSponsorshipEnabled()) {
    try {
      const { transactionHash } = await sendSponsoredTransaction({
        walletAccount: base as EvmWalletAccount,
        calls: [{ target: tx.to, data: tx.data, value: tx.value }],
      });
      return { txHash: transactionHash, sponsored: true };
    } catch (e) {
      if (!(e instanceof SponsorTransactionError)) throw e;
      nativeFailure = e.message;
    }
  }

  // 2. ZeroDev, if the environment runs sponsorship through that provider.
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
  // Unsponsored: the user pays gas. With zero ETH that fails at the node with a
  // bare "gas required exceeds allowance (0)", so say what actually happened.
  const eth = await publicClient.getBalance({ address: base.address as `0x${string}` });
  if (eth === BigInt(0)) {
    const why = nativeFailure
      ? `the relayer refused it (${nativeFailure})`
      : !isEvmGasSponsorshipEnabled() && !zerodev
        ? "gas sponsorship is not enabled on this Dynamic environment"
        : !isNetworkSponsored(network.networkId)
          ? "Ethereum Sepolia is not in the environment's sponsored-network list"
          : "the paymaster declined to sponsor this transaction";
    throw new Error(
      `This transfer was not sponsored because ${why}, and the wallet holds no ETH to pay gas itself. Turn on EVM gas sponsorship for this environment in the Dynamic dashboard (Enterprise, provisioned by Dynamic), or fund the wallet with a little Sepolia ETH to rehearse unsponsored.`,
    );
  }
  const walletClient = await createWalletClientForWalletAccount({ walletAccount: base as EvmWalletAccount });
  const txHash = await walletClient.sendTransaction(tx);
  return { txHash, sponsored: false };
}
