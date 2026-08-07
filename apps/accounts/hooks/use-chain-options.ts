"use client";

/**
 * Chain families a business-account wallet can be minted on.
 *
 * The grouping lives in `@dynamic-demos/dynamic/networks` so every app derives
 * the same list from the same data; this hook only supplies the fetch (with this
 * app's own SDK version) and the `WALLET_CHAINS` narrowing.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  deriveChainOptions,
  type ChainOption as SharedChainOption,
} from "@dynamic-demos/dynamic/networks";
import { getNetworksData, type NetworkData } from "@/lib/dynamic";
import { WALLET_CHAINS, type WalletChain } from "@/lib/chains";

export type ChainOption = SharedChainOption<WalletChain>;

export function useChainOptions(): ChainOption[] {
  const { data } = useQuery({
    queryKey: ["networks"],
    queryFn: () => getNetworksData() as NetworkData[],
    staleTime: Infinity,
  });

  return useMemo(
    () => deriveChainOptions<WalletChain>(data ?? [], { only: WALLET_CHAINS }),
    [data],
  );
}
