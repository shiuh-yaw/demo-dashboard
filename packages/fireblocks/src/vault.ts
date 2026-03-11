/**
 * Vault Operations
 *
 * Get-or-create pattern for deposit addresses. For account-based assets
 * (e.g. USDC on Base), Fireblocks requires one vault per entity — each gets
 * its own vault; funds can be swept to a treasury vault separately.
 *
 * Vault naming is caller-defined (e.g. prefix + userId).
 *
 * @see https://developers.fireblocks.com/reference/createvaultaccount
 * @see https://developers.fireblocks.com/reference/createvaultaccountasset
 */

import type { IFireblocksClient, DepositAddress } from "./types";

const VAULT_LIST_LIMIT = 200;

export interface DepositAddressWithVaultId extends DepositAddress {
  vaultId: string;
}

/**
 * Get or create a deposit address for a vault by name.
 * Looks up existing vault by name, or creates vault + asset wallet if not found.
 *
 * @param name - Vault account name (caller defines naming, e.g. prefix + userId).
 */
export async function getOrCreateDepositAddress(
  client: IFireblocksClient,
  name: string,
  assetId: string,
): Promise<DepositAddressWithVaultId> {
  const vaults = await client.listVaultAccounts(VAULT_LIST_LIMIT);
  const existing = vaults.find((v) => v.name === name);

  if (existing) {
    const addresses = await client.getDepositAddresses(existing.id, assetId);
    const addr = addresses[0];
    if (!addr) {
      throw new Error(
        `Vault ${existing.id} has no address for asset ${assetId}. Add the asset to the vault first.`,
      );
    }
    return { ...addr, vaultId: existing.id };
  }

  const vault = await client.createVaultAccount(name);
  const wallet = await client.createVaultWallet(vault.id, assetId);

  return {
    address: wallet.address,
    description: `Deposit for ${name}`,
    customerRefId: name,
    vaultId: vault.id,
  };
}

/**
 * Resolve the vault ID for an existing vault by name.
 * Returns null if no vault with the given name exists.
 */
export async function resolveVaultIdByName(
  client: IFireblocksClient,
  name: string,
): Promise<string | null> {
  const vaults = await client.listVaultAccounts(VAULT_LIST_LIMIT);
  const existing = vaults.find((v) => v.name === name);
  return existing?.id ?? null;
}
