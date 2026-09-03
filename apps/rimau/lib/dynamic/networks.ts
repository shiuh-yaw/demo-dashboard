"use client";

/**
 * Networks - find and switch to Ethereum Sepolia, and read gas-sponsorship
 * configuration from the environment's project settings.
 *
 * @see https://www.dynamic.xyz/docs/javascript/reference/wallets/switch-active-network
 * @see https://www.dynamic.xyz/docs/javascript/reference/zerodev/can-sponsor-transaction
 */

import {
  getNetworksData as sdkGetNetworksData,
  switchActiveNetwork as sdkSwitchActiveNetwork,
  type NetworkData,
  type WalletAccount,
} from "@dynamic-labs-sdk/client";
import { getClient, createSafeWrapper, createAsyncSafeWrapper } from "./client";
import { SEPOLIA_CHAIN_ID } from "@/lib/backend/types";

export type { NetworkData };

export const getNetworksData = createSafeWrapper(sdkGetNetworksData, [] as NetworkData[]);
export const switchActiveNetwork = createAsyncSafeWrapper(sdkSwitchActiveNetwork);

/** Sepolia as the environment configures it (the SDK ids EVM networks as "evm-<chainId>"). */
export function getSepoliaNetwork(): NetworkData | undefined {
  return getNetworksData().find((n) => n.chain === "EVM" && String(n.networkId).endsWith(String(SEPOLIA_CHAIN_ID)));
}

export async function switchToSepolia(walletAccount: WalletAccount): Promise<NetworkData> {
  const network = getSepoliaNetwork();
  if (!network) throw new Error("Ethereum Sepolia is not enabled in this Dynamic environment. Enable it in the dashboard under Chains & Networks.");
  await switchActiveNetwork({ networkId: network.networkId, walletAccount });
  return network;
}

/** Networks with ZeroDev gas sponsorship configured in the dashboard. */
export function getSponsoredNetworkIds(): string[] {
  const client = getClient();
  if (!client?.projectSettings) return [];
  const zerodev = client.projectSettings.providers?.find((p) => p.provider === "zerodev");
  return zerodev?.multichainAccountAbstractionProviders?.map((p) => p.chain) ?? [];
}

export function isNetworkSponsored(networkId: string): boolean {
  return getSponsoredNetworkIds().includes(networkId);
}
