"use client";

/**
 * Chain options for wallet creation, derived from the environment's enabled
 * networks.
 *
 * The grouping lives in `@dynamic-demos/dynamic/networks` (`deriveChainOptions`)
 * so accounts and wallet build the same list from the same data; this hook only
 * supplies the fetch. No `only` filter: this app offers whatever the
 * environment enables.
 */

import { useMemo } from "react";
import {
  deriveChainOptions,
  type ChainOption as SharedChainOption,
} from "@dynamic-demos/dynamic/networks";
import { useNetworks } from "./use-networks";
import type { Chain } from "@/lib/dynamic";

export type ChainOption = SharedChainOption<Chain>;

export function useChainOptions(): ChainOption[] {
  const { networks } = useNetworks();

  return useMemo(() => deriveChainOptions<Chain>(networks), [networks]);
}
