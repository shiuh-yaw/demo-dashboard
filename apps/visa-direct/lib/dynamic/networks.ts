"use client";

/**
 * Network helpers — wrappers around the Dynamic SDK's network APIs so the
 * UI shows the *actual* connected chain instead of hardcoded strings
 * ("Ethereum mainnet", "Sepolia", etc.).
 */

import {
  getNetworksData as sdkGetNetworksData,
  getActiveNetworkData as sdkGetActiveNetworkData,
  switchActiveNetwork as sdkSwitchActiveNetwork,
  type NetworkData,
} from "@dynamic-labs-sdk/client";
import { createAsyncSafeWrapper, createSafeWrapper } from "./client";
import type { WalletAccount } from "./wallets";
import { REQUIRED_NETWORK_ID } from "@/lib/network-config";

export const getNetworksData = createSafeWrapper(sdkGetNetworksData, []);

export async function getActiveNetworkData(params: {
  walletAccount: WalletAccount;
}) {
  return sdkGetActiveNetworkData(params);
}

/**
 * Make sure the given wallet account is on the given EVM network before
 * sending a transaction. The SDK's switch is a no-op when already on
 * the target chain, so it's safe to call unconditionally.
 */
export const switchActiveNetwork = createAsyncSafeWrapper(
  sdkSwitchActiveNetwork,
);

/**
 * Look up Ethereum Sepolia in the Dynamic environment's configured
 * networks. Returns `null` if Sepolia hasn't been enabled in the
 * Dynamic dashboard — callers can then surface a setup error instead
 * of silently falling back to the wrong chain.
 */
export function findSepoliaNetwork(): NetworkData | null {
  const networks = getNetworksData();
  return (
    networks.find(
      (n) => n.chain === "EVM" && n.networkId === REQUIRED_NETWORK_ID,
    ) ?? null
  );
}

/**
 * Pins the wallet account to Ethereum Sepolia.
 *
 * Fireblocks payouts target Sepolia, so the embedded wallet must
 * match regardless of what Dynamic's network provider picked by
 * default or what the user was on last. Safe to call on every render
 * — the SDK short-circuits when already active.
 *
 * Returns Sepolia's `NetworkData` so the caller can render it without
 * a second round-trip through `getActiveNetworkData`.
 */
export async function ensureSepoliaNetwork(
  walletAccount: WalletAccount,
): Promise<NetworkData | null> {
  const sepolia = findSepoliaNetwork();
  if (!sepolia) return null;

  try {
    const { networkData: active } = await sdkGetActiveNetworkData({
      walletAccount,
    });
    if (active?.networkId === REQUIRED_NETWORK_ID) return sepolia;
  } catch {
    // fall through and try to switch — better to attempt than bail
  }

  try {
    await sdkSwitchActiveNetwork({
      networkId: REQUIRED_NETWORK_ID,
      walletAccount,
    });
  } catch {
    // Some providers (e.g. read-only WC sessions) refuse programmatic
    // switching. Returning Sepolia's data still lets the UI render the
    // intended chain; send-usdc will retry the switch at submit time.
  }

  return sepolia;
}

export type { NetworkData };
