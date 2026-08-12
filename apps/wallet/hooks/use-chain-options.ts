"use client";

/**
 * Chain options for wallet creation, derived from the environment's enabled
 * networks.
 *
 * The grouping lives in `@dynamic-demos/dynamic/networks` (`deriveChainOptions`)
 * so accounts and wallet build the same list from the same data; this hook only
 * supplies the fetch and the `only` filter.
 */

import { useMemo } from "react";
import {
  deriveChainOptions,
  type ChainOption as SharedChainOption,
} from "@dynamic-demos/dynamic/networks";
import { useNetworks } from "./use-networks";
import { WAAS_CHAINS, type Chain } from "@/lib/dynamic";

export type ChainOption = SharedChainOption<Chain>;

export function useChainOptions(): ChainOption[] {
  const { networks } = useNetworks();

  return useMemo(
    // Intersect what the environment enables with what we registered a WaaS
    // extension for: an enabled chain we can't serve would dead-end on click.
    () =>
      deriveChainOptions<Chain>(networks, {
        only: WAAS_CHAINS as readonly Chain[],
      }),
    [networks],
  );
}
