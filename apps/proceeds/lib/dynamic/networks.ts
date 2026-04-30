"use client";

import {
  getNetworksData as sdkGetNetworksData,
  getActiveNetworkData as sdkGetActiveNetworkData,
  switchActiveNetwork as sdkSwitchActiveNetwork,
} from "@dynamic-labs-sdk/client";
import { createSafeWrapper, createAsyncSafeWrapper } from "./client";
import type { WalletAccount } from "./wallets";

export const getNetworksData = createSafeWrapper(sdkGetNetworksData, []);

export async function getActiveNetworkData(params: { walletAccount: WalletAccount }) {
  return sdkGetActiveNetworkData(params);
}

export const switchActiveNetwork = createAsyncSafeWrapper(sdkSwitchActiveNetwork);
