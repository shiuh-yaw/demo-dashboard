"use client";

import {
  getNetworksData as sdkGetNetworksData,
  getActiveNetworkData as sdkGetActiveNetworkData,
  switchActiveNetwork as sdkSwitchActiveNetwork,
  type WalletAccount,
  type NetworkData,
} from "@dynamic-labs-sdk/client";
import { getClient, createSafeWrapper, createAsyncSafeWrapper } from "./client";

export const getNetworksData = createSafeWrapper(sdkGetNetworksData, []);

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

export type { NetworkData };
