/**
 * Fireblocks per-chain configuration.
 *
 * The active chain is owned by the Dynamic SDK (the wallet card and header
 * network switcher are the user-facing surfaces). Fireblocks payouts read
 * `chainId` from the request and look up the matching provider/account/asset.
 *
 * Chains enabled in Dynamic but absent from this map fall through to the
 * mock branch in `createPayoutOrder` — useful for testnets where no
 * Fireblocks provider account exists yet.
 */

export interface FireblocksChainConfig {
  providerId: string;
  accountId: string;
  assetId: string;
  networkDisplay: string;
}

export const FIREBLOCKS_CONFIGS: Record<number, FireblocksChainConfig> = {
  // Polygon Mainnet — production Fireblocks tenant
  137: {
    providerId: "FIREBLOCKS",
    accountId: "3447380b-66a8-4a32-ba10-bd79913e3409",
    assetId: "USDC_POLYGON_NXTB",
    networkDisplay: "Polygon (USDC)",
  },
};

export function getFireblocksConfig(
  chainId: number,
): FireblocksChainConfig | null {
  return FIREBLOCKS_CONFIGS[chainId] ?? null;
}

/**
 * Reverse lookup: Fireblocks `quoteAssetId` → `{ chainId, networkDisplay }`.
 * Used by the pending-payouts surface to label each in-flight order with
 * the chain it targets. Falls back to a best-effort guess when an asset
 * id matches no configured chain — keeps the UI legible even when a
 * Fireblocks tenant has assets we haven't mapped here yet.
 */
const ASSET_ID_TO_CHAIN: Map<string, FireblocksChainConfig & { chainId: number }> =
  new Map(
    Object.entries(FIREBLOCKS_CONFIGS).map(([chainId, cfg]) => [
      cfg.assetId,
      { ...cfg, chainId: Number(chainId) },
    ]),
  );

export interface ChainFromAssetId {
  chainId: number | null;
  networkDisplay: string;
}

/**
 * Best-effort chain inference from a Fireblocks `quoteAssetId`.
 *
 * - When the asset id matches a configured chain, returns the canonical
 *   chainId + display name from `FIREBLOCKS_CONFIGS`.
 * - When it doesn't, tries to extract a friendly chain label from the
 *   asset id segment (`USDC_POLYGON_NXTB` → "Polygon"). `chainId`
 *   remains `null` in that case so the caller knows it's a guess.
 */
export function chainFromAssetId(
  assetId: string | null | undefined,
): ChainFromAssetId {
  if (!assetId) return { chainId: null, networkDisplay: "Unknown chain" };

  const exact = ASSET_ID_TO_CHAIN.get(assetId);
  if (exact) {
    return { chainId: exact.chainId, networkDisplay: exact.networkDisplay };
  }

  // `USDC_POLYGON_NXTB` → ["USDC", "POLYGON", "NXTB"] → "Polygon"
  // `USDC_ETH_TEST5_0GER` → ["USDC", "ETH", "TEST5", "0GER"] → "Eth Test5"
  // We capitalise the second segment (the chain hint) and fall through.
  const parts = assetId.split("_");
  const hint = parts[1] ? parts[1].toLowerCase() : null;
  if (!hint) return { chainId: null, networkDisplay: assetId };

  const niceHint =
    hint === "eth"
      ? "Ethereum"
      : hint.charAt(0).toUpperCase() + hint.slice(1);
  return { chainId: null, networkDisplay: niceHint };
}
