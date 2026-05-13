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

import type {
  IFireblocksClient,
  DepositAddress,
  VaultAccount,
  VaultAccountTag,
  VaultAccountsTagAttachmentOperationsResponse,
} from "./types";

const VAULT_LIST_LIMIT = 200;

export interface DepositAddressWithVaultId extends DepositAddress {
  vaultId: string;
}

/**
 * Fetch a single vault by id. Returns `null` if the account does not exist (HTTP 404).
 */
export async function tryGetVaultAccount(
  client: IFireblocksClient,
  vaultAccountId: string,
): Promise<VaultAccount | null> {
  try {
    return await client.vault.getAccount(vaultAccountId);
  } catch (err) {
    const status =
      err !== null &&
      typeof err === "object" &&
      "response" in err &&
      typeof (err as { response?: { status?: unknown } }).response?.status ===
        "number"
        ? (err as { response: { status: number } }).response.status
        : undefined;
    if (status === 404) return null;
    throw err;
  }
}

/**
 * Look up a vault account by name, or create it if missing.
 *
 * @param name - Vault account name (caller defines naming, e.g. prefix + userId).
 * @param opts.visibleInConsole - When `false`, vault is hidden in the Fireblocks console (`hiddenOnUI`). Default `true` (visible).
 */
export async function getOrCreateVaultByName(
  client: IFireblocksClient,
  name: string,
  opts?: { visibleInConsole?: boolean; customerRefId?: string },
): Promise<{ vaultId: string; tags: VaultAccountTag[] }> {
  const vaults = await client.vault.listAccounts(VAULT_LIST_LIMIT);
  const existing = vaults.find((v) => v.name === name);
  if (existing) {
    return { vaultId: existing.id, tags: existing.tags };
  }
  const hiddenOnUI = opts?.visibleInConsole === false;
  const vault = await client.vault.createAccount(name, {
    hiddenOnUI,
    ...(opts?.customerRefId ? { customerRefId: opts.customerRefId } : {}),
  });
  return { vaultId: vault.id, tags: vault.tags };
}

/**
 * Ensure a deposit address exists for a given vault + asset (wallet is created if missing).
 */
export async function getOrCreateDepositAddressForVault(
  client: IFireblocksClient,
  vaultId: string,
  assetId: string,
): Promise<DepositAddressWithVaultId> {
  let addresses = await client.vault.getDepositAddresses(vaultId, assetId);
  if (!addresses[0]) {
    const wallet = await client.vault.createWallet(vaultId, assetId);
    addresses = await client.vault.getDepositAddresses(vaultId, assetId);

    const addr = addresses[0];
    if (addr) return { ...addr, vaultId };

    return {
      address: wallet.address,
      tag: wallet.tag,
      type: wallet.type,
      customerRefId: wallet.customerRefId,
      vaultId,
    };
  }
  return { ...addresses[0]!, vaultId };
}

/**
 * Get or create a deposit address for a vault by name.
 * Looks up existing vault by name, or creates vault + asset wallet if not found.
 *
 * @param name - Vault account name (caller defines naming, e.g. prefix + userId).
 * @param opts.visibleInConsole - When `false`, vault is hidden in the Fireblocks console (`hiddenOnUI`). Default `true` (visible).
 */
export async function getOrCreateDepositAddress(
  client: IFireblocksClient,
  name: string,
  assetId: string,
  opts?: { visibleInConsole?: boolean; customerRefId?: string },
): Promise<DepositAddressWithVaultId> {
  const { vaultId } = await getOrCreateVaultByName(client, name, opts);
  return getOrCreateDepositAddressForVault(client, vaultId, assetId);
}

/**
 * Resolve the vault ID for an existing vault by name.
 * Returns null if no vault with the given name exists.
 */
export async function resolveVaultIdByName(
  client: IFireblocksClient,
  name: string,
): Promise<string | null> {
  const vaults = await client.vault.listAccounts(VAULT_LIST_LIMIT);
  const existing = vaults.find((v) => v.name === name);
  return existing?.id ?? null;
}

/**
 * Attach workspace tags to one or more vault accounts.
 *
 * @see https://developers.fireblocks.com/reference/attachordetachtagsfromvaultaccounts
 */
export async function attachTagsToVaultAccounts(
  client: IFireblocksClient,
  vaultAccountIds: string[],
  tagIdsToAttach: string[],
  opts?: { idempotencyKey?: string },
): Promise<VaultAccountsTagAttachmentOperationsResponse> {
  return client.vault.attachOrDetachTags(
    { vaultAccountIds, tagIdsToAttach },
    opts,
  );
}
