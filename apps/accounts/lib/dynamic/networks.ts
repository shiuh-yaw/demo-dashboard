"use client";

/**
 * Networks configured in the Dynamic dashboard - the source for which chains
 * a wallet can be minted on, and their display names.
 *
 * @see https://www.dynamic.xyz/docs/javascript/reference/wallets/get-active-network
 */

import {
  getActiveNetworkData as sdkGetActiveNetworkData,
  getNetworksData as sdkGetNetworksData,
  switchActiveNetwork as sdkSwitchActiveNetwork,
  type NetworkData,
  type WalletAccount,
} from "@dynamic-labs-sdk/client";
import { createSafeWrapper, getClient } from "./client";

/** All enabled networks. Empty during SSR. */
export const getNetworksData = createSafeWrapper(sdkGetNetworksData, []);

/**
 * The network a wallet is currently pointed at.
 *
 * Per-wallet, not global: two wallets on the same chain can sit on different
 * networks, which is why every read and every send takes the wallet rather
 * than assuming one app-wide selection.
 */
export async function getActiveNetworkData(params: {
  walletAccount: WalletAccount;
}): Promise<NetworkData | undefined> {
  if (!getClient()) return undefined;
  try {
    const { networkData } = await sdkGetActiveNetworkData(params);
    return networkData;
  } catch {
    return undefined;
  }
}

/**
 * Point a wallet at another network.
 *
 * Throws on refusal - unlike the reads above. A silent no-op would leave the
 * user looking at a balance and a history for a network they did not choose.
 */
export async function switchActiveNetwork(params: {
  networkId: string;
  walletAccount: WalletAccount;
}): Promise<void> {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");
  await sdkSwitchActiveNetwork(params, client);
}

export type { NetworkData };
