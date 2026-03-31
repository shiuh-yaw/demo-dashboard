export type DepositNetwork = "base" | "base-sepolia";

export const DEPOSIT_NETWORK_STORAGE_KEY = "deposit-demo-network";

export const DEPOSIT_NETWORK_OPTIONS: {
  value: DepositNetwork;
  label: string;
}[] = [
  { value: "base", label: "Base" },
  { value: "base-sepolia", label: "Base Sepolia" },
];

export function isDepositNetwork(value: string): value is DepositNetwork {
  return value === "base" || value === "base-sepolia";
}

/** Build-time default when no persisted choice exists (matches `NEXT_PUBLIC_NETWORK`). */
export function defaultDepositNetworkFromEnv(): DepositNetwork {
  const e = process.env.NEXT_PUBLIC_NETWORK ?? "";
  return isDepositNetwork(e) ? e : "base-sepolia";
}

export function depositNetworkLabel(network: DepositNetwork): string {
  return network === "base" ? "Base" : "Base Sepolia";
}

/** EVM chain IDs for deposit networks. */
export const DEPOSIT_CHAIN_IDS: Record<DepositNetwork, number> = {
  base: 8453,
  "base-sepolia": 84532,
};

/**
 * Extract a numeric chain ID from a Dynamic SDK `networkId`.
 * The SDK may return `"8453"`, `"evm-8453"`, or a number — this handles all forms.
 */
export function chainIdFromNetworkId(networkId: string | number): number | null {
  const s = String(networkId);
  const match = s.match(/^evm-(\d+)$/);
  const n = parseInt(match?.[1] ?? s, 10);
  return Number.isNaN(n) ? null : n;
}

/** Map a Dynamic SDK `networkId` back to a `DepositNetwork`, or `null` if unknown. */
export function depositNetworkFromNetworkId(
  networkId: string | number,
): DepositNetwork | null {
  const chainId = chainIdFromNetworkId(networkId);
  if (chainId == null) return null;
  for (const [network, id] of Object.entries(DEPOSIT_CHAIN_IDS)) {
    if (id === chainId) return network as DepositNetwork;
  }
  return null;
}
