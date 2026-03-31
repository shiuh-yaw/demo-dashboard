"use client";

import {
  getAvailableWalletProvidersData as sdkGetAvailableWalletProvidersData,
  connectAndVerifyWithWalletProvider as sdkConnectAndVerifyWithWalletProvider,
  type WalletProviderData,
} from "@dynamic-labs-sdk/client";
import { createSafeWrapper } from "./client";

export const getAvailableWalletProviders = createSafeWrapper(
  sdkGetAvailableWalletProvidersData,
  [],
);

export async function connectAndVerifyWithWalletProvider(params: {
  walletProviderKey: string;
}) {
  return sdkConnectAndVerifyWithWalletProvider(params);
}

export type { WalletProviderData };
