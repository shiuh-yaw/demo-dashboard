"use client";

/**
 * Networks
 *
 * Query and switch between blockchain networks configured in the
 * Dynamic dashboard.
 *
 * @see https://www.dynamic.xyz/docs/javascript/reference/wallets/get-active-network
 * @see https://www.dynamic.xyz/docs/javascript/reference/wallets/switch-active-network
 */

import {
  getNetworksData as sdkGetNetworksData,
  getActiveNetworkData as sdkGetActiveNetworkData,
  switchActiveNetwork as sdkSwitchActiveNetwork,
  addNetwork as sdkAddNetwork,
  type WalletAccount,
  type NetworkData,
} from "@dynamic-labs-sdk/client";
import { getClient, createAsyncSafeWrapper } from "./client";

/** Get all enabled networks from Dynamic dashboard. Returns [] when client not ready. */
export async function getNetworksData(): Promise<NetworkData[]> {
  const client = getClient();
  if (!client) return [];
  try {
    const result = await sdkGetNetworksData();
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}

export async function getActiveNetworkData(params: {
  walletAccount: WalletAccount;
}): Promise<{ networkData: NetworkData | undefined }> {
  const client = getClient();
  if (!client) return { networkData: undefined };

  try {
    return await sdkGetActiveNetworkData(params);
  } catch {
    return { networkData: undefined };
  }
}

export const switchActiveNetwork = createAsyncSafeWrapper(
  sdkSwitchActiveNetwork,
);

export const addNetwork = createAsyncSafeWrapper(sdkAddNetwork);

export type { NetworkData };
