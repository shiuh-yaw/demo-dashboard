/**
 * Omnibus Vault Operations
 *
 * For account-based assets (e.g. USDC on Base), Fireblocks requires one vault
 * per external entity — you cannot create multiple deposit addresses in a
 * single vault. Each entity gets an intermediate deposit vault; funds are
 * swept to the omnibus/treasury vault separately.
 *
 * Vault naming: Different use cases require distinct vault prefixes so each
 * entity can have multiple vaults. The caller provides vaultNamePrefix and
 * externalId — this package does not define application-specific naming.
 *
 * @see https://developers.fireblocks.com/docs/creating-an-omnibus-vault-structure
 */

import type {
  IFireblocksClient,
  VaultAccount,
  DepositAddress,
  OmnibusStructure,
} from "../types";

export async function createOmnibusStructure(
  client: IFireblocksClient,
  name: string,
  assetId: string,
): Promise<OmnibusStructure> {
  const vault = await client.createVaultAccount(name);
  await client.createVaultWallet(vault.id, assetId);

  return {
    omnibusVaultId: vault.id,
    omnibusVaultName: vault.name,
    assetId,
    depositAddresses: new Map(),
  };
}

/**
 * Get or create a deposit address for a given external entity (account-based omnibus).
 * Creates one vault per externalId; each vault has a single address from its asset wallet.
 *
 * @param externalId - Caller-defined identifier (e.g. userId, customerId).
 * @param vaultNamePrefix - Prefix for vault naming. Caller defines this (e.g. per use case).
 */
export async function getDepositAddressForUser(
  client: IFireblocksClient,
  externalId: string,
  assetId: string,
  vaultNamePrefix: string,
): Promise<DepositAddress> {
  const expectedName = vaultNamePrefix + externalId;

  const vaults = await client.listVaultAccounts(200);
  const existing = vaults.find((v) => v.name === expectedName);

  if (existing) {
    const addresses = await client.getDepositAddresses(existing.id, assetId);
    const addr = addresses[0];
    if (!addr) {
      throw new Error(
        `Vault ${existing.id} has no address for asset ${assetId}. Add the asset to the vault first.`,
      );
    }
    return addr;
  }

  const vault = await client.createVaultAccount(expectedName);
  const wallet = await client.createVaultWallet(vault.id, assetId);

  return {
    address: wallet.address,
    description: `Deposit for ${externalId}`,
    customerRefId: externalId,
  };
}

export async function getOmnibusVaultBalance(
  client: IFireblocksClient,
  omnibusVaultId: string,
): Promise<VaultAccount> {
  return client.getVaultAccount(omnibusVaultId);
}
