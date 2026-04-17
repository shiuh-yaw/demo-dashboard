"use client";

import { useEffect } from "react";
import { useSdkQuery } from "./use-sdk-query";
import {
  ensureSepoliaNetwork,
  findSepoliaNetwork,
  getPrimarySmartEvmAccount,
  onEvent,
  type NetworkData,
  type WalletAccount,
} from "@/lib/dynamic";
import { SEPOLIA_NETWORK } from "@/lib/network-config";

function getPrimaryEvmAccount(): WalletAccount | null {
  return getPrimarySmartEvmAccount();
}

/**
 * Synthetic Sepolia `NetworkData` used when the Dynamic environment
 * doesn't have Sepolia enabled. Shape-compatible with Dynamic's real
 * `NetworkData` so UI code that reads `displayName` / `networkId` /
 * `rpcUrls` keeps working. Extra fields Dynamic sometimes uses
 * (`name`, `iconUrl`, `blockExplorerUrls`) are populated too.
 */
const SYNTHETIC_SEPOLIA: NetworkData = {
  chain: "EVM",
  networkId: SEPOLIA_NETWORK.networkId,
  displayName: SEPOLIA_NETWORK.displayName,
  blockExplorerUrls: [SEPOLIA_NETWORK.blockExplorerUrl],
  iconUrl: "",
  nativeCurrency: {
    decimals: 18,
    name: "Sepolia ETH",
    symbol: "ETH",
  },
  rpcUrls: { http: [SEPOLIA_NETWORK.rpcUrl] },
  testnet: true,
} as NetworkData;

interface UseActiveNetworkResult {
  /** Sepolia `NetworkData` — either from Dynamic or a synthesized fallback. */
  networkData: NetworkData;
  /** Display string suitable for UI — always "Sepolia". */
  networkLabel: string;
  /** Numeric chain ID — always Sepolia (11155111). */
  chainId: number;
  isLoading: boolean;
  refetch: () => void;
}

/**
 * Always returns Ethereum Sepolia as the active network.
 *
 * Visa Direct's payouts land on Sepolia (Fireblocks testnet), so the
 * wallet's on-chain reads and transaction flows all live there.
 * This hook:
 *
 *   1. If the user has an EVM wallet + Sepolia is enabled in the
 *      Dynamic environment, asks Dynamic to switch the wallet to
 *      Sepolia (so subsequent signing flows are on the right chain).
 *   2. Returns Dynamic's Sepolia `NetworkData` when available, or a
 *      synthetic Sepolia object built from `viem/chains` when not.
 *
 * Either way, consumers see a Sepolia-shaped object with a working
 * RPC URL, so balance reads and labels stay correct even if the
 * Dynamic dashboard only has mainnet enabled.
 */
export function useActiveNetwork(): UseActiveNetworkResult {
  const { data, refetch, isLoading } = useSdkQuery<{
    networkData: NetworkData;
  }>({
    queryKey: ["activeNetwork"],
    queryFn: async () => {
      const walletAccount = getPrimaryEvmAccount();
      if (walletAccount) {
        const sepolia = await ensureSepoliaNetwork(walletAccount);
        if (sepolia) return { networkData: sepolia };
      }

      const sepolia = findSepoliaNetwork();
      if (sepolia) return { networkData: sepolia };

      // Dynamic environment doesn't expose Sepolia — fall back to a
      // synthetic NetworkData so the UI still labels the chain as
      // "Sepolia" and callers get a working RPC URL from viem.
      return { networkData: SYNTHETIC_SEPOLIA };
    },
    refetchEvent: "walletAccountsChanged",
  });

  // Re-run when the SDK's provider changes (new wallet, chain flip,
  // session restore) so we re-pin Sepolia if it drifts.
  useEffect(() => {
    const unsubscribe = onEvent({
      event: "walletProviderChanged",
      listener: () => void refetch(),
    });
    return unsubscribe;
  }, [refetch]);

  const networkData = data?.networkData ?? SYNTHETIC_SEPOLIA;

  return {
    networkData,
    networkLabel: networkData.displayName,
    chainId: Number(networkData.networkId),
    isLoading,
    refetch: () => void refetch(),
  };
}
