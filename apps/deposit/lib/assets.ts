/**
 * Derived helpers for deposit assets, explorer URLs, and vault naming.
 *
 * All asset data comes from {@link DEPOSIT_ASSETS} in `deposit-config.ts` —
 * this module only contains functions that operate on that data.
 */

import type { DepositFireblocksNetworkKey } from "@dynamic-demos/dynamic";
import type { DepositNetwork } from "./deposit-network";
import {
  DEPOSIT_ASSETS,
  DEPOSIT_VAULT_PREFIX,
  type DepositAssetConfig,
  type DepositAssetKey,
} from "./deposit-config";

/** Re-export for convenience — most consumers only need these. */
export {
  DEPOSIT_ASSETS,
  DEPOSIT_VAULT_PREFIX,
  DEPOSIT_FIREBLOCKS_VAULT_TAG_ID,
  type DepositAssetKey,
  type DepositAssetConfig,
} from "./deposit-config";

const allAssets = Object.values(DEPOSIT_ASSETS) as DepositAssetConfig[];

/** Fireblocks asset ID for a given asset key + network. */
export function getDepositAssetId(
  network: DepositNetwork,
  key: DepositAssetKey = "USDC",
): string {
  const cfg = DEPOSIT_ASSETS[key];
  return network === "base" ? cfg.assetId : cfg.testnetAssetId;
}

/** All Fireblocks asset IDs to provision on a vault for the given network. */
export function getDepositAssetIds(network: DepositNetwork): string[] {
  return allAssets.map((a) =>
    network === "base" ? a.assetId : a.testnetAssetId,
  );
}

/** Resolve the deposit network from a Fireblocks asset ID on an incoming tx. */
export function depositFireblocksNetworkFromAssetId(
  assetId: string,
): DepositFireblocksNetworkKey | null {
  const id = assetId.trim();
  for (const asset of allAssets) {
    if (id === asset.assetId) return "base";
    if (id === asset.testnetAssetId) return "base-sepolia";
  }
  return null;
}

/** Look up asset config by its Fireblocks asset ID (mainnet or testnet). */
export function depositAssetByFireblocksId(
  assetId: string,
): DepositAssetConfig | null {
  const id = assetId.trim();
  return (
    allAssets.find((a) => a.assetId === id || a.testnetAssetId === id) ?? null
  );
}

export function getVaultName(userId: string): string {
  return `${DEPOSIT_VAULT_PREFIX}${userId}`;
}

/** Extract the Dynamic user id from a vault name like `"Deposit Vault - {userId}"`. */
export function dynamicUserIdFromVaultName(vaultName: string): string | null {
  const trimmed = String(vaultName ?? "").trim();
  if (!trimmed.startsWith(DEPOSIT_VAULT_PREFIX)) return null;
  const id = trimmed.slice(DEPOSIT_VAULT_PREFIX.length).trim();
  return id || null;
}

function basescanOrigin(network: DepositNetwork): string {
  return network === "base"
    ? "https://basescan.org"
    : "https://sepolia.basescan.org";
}

/** Basescan address page for the configured Base network. */
export function getBaseAddressExplorerUrl(
  network: DepositNetwork,
  address: string,
): string {
  return `${basescanOrigin(network)}/address/${address.trim()}`;
}

/** Basescan transaction page for the configured Base network. */
export function getBaseTxExplorerUrl(
  network: DepositNetwork,
  txHash: string,
): string {
  return `${basescanOrigin(network)}/tx/${txHash.trim()}`;
}
