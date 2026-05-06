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
