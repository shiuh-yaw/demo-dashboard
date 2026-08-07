/**
 * Network configuration factory.
 *
 * Lightweight convenience layer — the *canonical* source of truth for which
 * networks Dynamic registers is the Dynamic Dashboard. This factory lets a
 * demo app declare which chains it cares about and get matching `networkId`s
 * for off-SDK queries (token balance lookups, multichain queries, etc.).
 *
 * Sandbox-by-default (D-005).
 */

export type SupportedChain =
  | "ethereum"
  | "base"
  | "polygon"
  | "arbitrum"
  | "optimism"
  | "solana";

export const KNOWN_NETWORK_IDS: Record<
  SupportedChain,
  { mainnet: number; testnet: number }
> = {
  ethereum: { mainnet: 1, testnet: 11155111 }, // sepolia
  base: { mainnet: 8453, testnet: 84532 }, // base-sepolia
  polygon: { mainnet: 137, testnet: 80002 }, // amoy
  arbitrum: { mainnet: 42161, testnet: 421614 }, // arbitrum-sepolia
  optimism: { mainnet: 10, testnet: 11155420 }, // op-sepolia
  // Solana network ids are mainnet-beta = 101, devnet = 103 in some SDK conventions;
  // the JS SDK uses string identifiers for Solana networks. We expose numeric
  // placeholders for callers that don't need Solana but want the row present.
  solana: { mainnet: 101, testnet: 103 },
};

export interface NetworkConfigEntry {
  chain: SupportedChain;
  networkId: number;
  sandbox: boolean;
}

export interface CreateNetworkConfigOptions {
  chains: SupportedChain[];
  /** When omitted or true, returns testnet ids. */
  sandbox?: boolean;
}

export function createNetworkConfig(
  opts: CreateNetworkConfigOptions,
): NetworkConfigEntry[] {
  const sandbox = opts.sandbox ?? true;
  return opts.chains.map((chain) => {
    const known = KNOWN_NETWORK_IDS[chain];
    if (!known) {
      throw new Error(`Unknown chain "${chain}" — extend KNOWN_NETWORK_IDS.`);
    }
    return {
      chain,
      networkId: sandbox ? known.testnet : known.mainnet,
      sandbox,
    };
  });
}

// =============================================================================
// CHAIN OPTIONS — grouping live SDK network data into a pickable chain list
// =============================================================================

/**
 * The shape this needs from the SDK's `getNetworksData()` entries, declared
 * structurally rather than imported.
 *
 * Deliberate: this package has no Dynamic SDK dependency, and apps do not agree
 * on a version (accounts pins 1.25.0 for business accounts, the workspace
 * catalog is on 0.25.0). Importing `NetworkData` here would bind every consumer
 * to one of them. Each app fetches with its own SDK and passes the result in.
 */
export interface NetworkLike {
  chain: string;
  displayName: string;
  iconUrl?: string;
}

/** One row in an "add a wallet" chain picker. */
export interface ChainOption<TChain extends string = string> {
  /** Chain family as the SDK names it (`EVM`, `SOL`, `BTC`, …). */
  id: TChain;
  name: string;
  /** The networks in that family, comma-separated. */
  description: string;
  /** Icon of the family's first network. */
  icon?: string;
}

export interface DeriveChainOptionsOptions<TChain extends string> {
  /**
   * Restrict to these chains, in this order.
   *
   * Callers pass the chains they register a WaaS extension for: wallet creation
   * resolves the provider by chain, so an unregistered chain throws at the
   * moment of the click rather than at boot. Filtering here keeps every row in
   * the list one that actually works. Omit to accept whatever the environment
   * enables, in first-seen order.
   */
  only?: readonly TChain[];
}

/**
 * Group networks into one row per chain family.
 *
 * Pure: no React, no SDK, no fetching - so the grouping and ordering rules are
 * unit-testable, and every app gets the same list from the same data.
 */
export function deriveChainOptions<TChain extends string = string>(
  networks: readonly NetworkLike[],
  options: DeriveChainOptionsOptions<TChain> = {},
): ChainOption<TChain>[] {
  const allowed = options.only ? new Set<string>(options.only) : undefined;

  const families = new Map<string, { icon?: string; names: string[] }>();
  for (const network of networks) {
    if (allowed && !allowed.has(network.chain)) continue;
    const family = families.get(network.chain);
    if (family) family.names.push(network.displayName);
    else
      families.set(network.chain, {
        icon: network.iconUrl,
        names: [network.displayName],
      });
  }

  // `only`'s order wins when given, so the list does not reshuffle when the
  // environment reorders its networks. Otherwise first-seen order.
  const order = options.only ?? [...families.keys()];

  return order.flatMap((chain) => {
    const family = families.get(chain);
    if (!family) return [];
    return [
      {
        id: chain as TChain,
        name: chain,
        description: family.names.join(", "),
        icon: family.icon,
      },
    ];
  });
}
