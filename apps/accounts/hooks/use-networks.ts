"use client";

/**
 * Every network enabled on the Dynamic environment, and the picker options for
 * one chain.
 *
 * Shares the `["networks"]` query key with `use-chain-options`, so the wallet
 * screens and the Add Wallet chain picker read one fetch.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { NetworkOption } from "@dynamic-demos/ui";
import { getNetworksData, type NetworkData } from "@/lib/dynamic";

export function useNetworks() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["networks"],
    queryFn: () => getNetworksData() as NetworkData[],
    staleTime: Infinity,
  });

  return { networks: data ?? [], isLoading, error };
}

/**
 * The networks a given chain can switch between, as `NetworkSelect` options.
 *
 * `networkId` is `string | number` on `NetworkData` but the selector's value is
 * a string, so it is normalised here rather than at three call sites.
 */
export function useNetworkOptions(chain: string | undefined): NetworkOption[] {
  const { networks } = useNetworks();

  return useMemo(() => {
    if (!chain) return [];
    return networks
      .filter((network) => network.chain === chain)
      .map((network) => ({
        id: String(network.networkId),
        label: network.displayName,
        iconUrl: network.iconUrl,
      }));
  }, [networks, chain]);
}
