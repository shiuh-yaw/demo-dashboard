/**
 * Central configuration for deposit-supported assets and Fireblocks workspace constants.
 *
 * To add a new asset, add an entry to {@link DEPOSIT_ASSETS} — the rest of the
 * app (asset-id resolution, balance reads, provisioning) derives from this map.
 */

import type { DepositNetwork } from "./deposit-network";

export interface DepositAssetConfig {
  /** Fireblocks mainnet asset ID (workspace-specific). */
  assetId: string;
  /** Fireblocks testnet asset ID (workspace-specific). */
  testnetAssetId: string;
  name: string;
  symbol: string;
  decimals: number;
  /** On-chain token contract address per network (for balance reads). */
  contract: Record<DepositNetwork, `0x${string}`>;
}

export const DEPOSIT_ASSETS = {
  USDC: {
    assetId: "USDC_BASECHAIN_ETH_5I5C",
    testnetAssetId: "USDC_BASECHAIN_ETH_TEST5_8SH8",
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    contract: {
      base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "base-sepolia": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    },
  },
} as const satisfies Record<string, DepositAssetConfig>;

export type DepositAssetKey = keyof typeof DEPOSIT_ASSETS;

/** Fireblocks workspace tag UUID attached to new deposit vaults. */
export const DEPOSIT_FIREBLOCKS_VAULT_TAG_ID =
  "d99b8a9a-bb49-4e81-b4f7-30a1771040c2";

export const DEPOSIT_VAULT_PREFIX = "Deposit Vault - ";
