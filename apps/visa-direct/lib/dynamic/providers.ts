"use client";

/**
 * External wallet provider discovery + connection.
 *
 * Thin SSR-safe wrappers around Dynamic's `getAvailableWalletProvidersData`
 * and `connectAndVerifyWithWalletProvider`. The EVM extension (registered
 * in `client.ts`) is what surfaces browser-injected providers (MetaMask,
 * Coinbase Wallet, Rabby, …) and WalletConnect-capable providers in the
 * returned list — we don't need any additional SDK modules for this app.
 *
 * After `connectAndVerifyWithWalletProvider` resolves, the newly-linked
 * wallet shows up in `getWalletAccounts()`. The modal reads the address
 * from there via `getExternalEvmWalletAccount()` in `./wallets`.
 */

import {
  getAvailableWalletProvidersData as sdkGetAvailableWalletProvidersData,
  connectAndVerifyWithWalletProvider as sdkConnectAndVerifyWithWalletProvider,
  type WalletProviderData,
} from "@dynamic-labs-sdk/client";
import { createSafeWrapper, createAsyncSafeWrapper } from "./client";

export const getAvailableWalletProviders = createSafeWrapper(
  sdkGetAvailableWalletProvidersData,
  [] as WalletProviderData[],
);

export const connectAndVerifyWithWalletProvider = createAsyncSafeWrapper(
  sdkConnectAndVerifyWithWalletProvider,
);

export type { WalletProviderData };
