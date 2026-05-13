import {
  attachTagsToVaultAccounts,
  type IFireblocksClient,
  type VaultAccount,
} from "@dynamic-demos/fireblocks";

export type ProvisionDepositVaultOptions = {
  /**
   * Fireblocks workspace tag UUIDs to attach if not already on the vault.
   * Omit or `[]` to create the vault without attaching tags.
   */
  tagIds?: string[];
  /**
   * Fireblocks customer reference ID to set on the vault.
   * Omit or `undefined` to create the vault without a customer reference ID.
   */
  customerRefId?: string;
  /**
   * Whether to hide the vault on the Fireblocks console.
   * Omit or `false` to create the vault visible in the console.
   */
  hiddenOnUI?: boolean;
  /**
   * Enable Gas Station auto-fueling so the vault can send gasless transactions.
   * Defaults to `true`.
   */
  autoFuel?: boolean;
};

async function attachVaultTagsIfNeeded(
  client: IFireblocksClient,
  vault: VaultAccount,
  tagIds: string[],
): Promise<void> {
  if (tagIds.length === 0) return;
  const existing = new Set(vault.tags.map((t) => t.id));
  const toAttach = tagIds.filter((id) => id.trim() !== "" && !existing.has(id));
  if (toAttach.length === 0) return;
  try {
    await attachTagsToVaultAccounts(client, [vault.id], toAttach);
  } catch (err) {
    console.warn(
      "[deposit/provision-vault] attachTagsToVaultAccounts failed; continuing without tags",
      err instanceof Error ? err.message : err,
    );
  }
}

/**
 * First-time vault setup: create the deposit vault and attach optional workspace tags.
 * When a vault id is already stored on the user, the provision route skips this entirely.
 */
export async function provisionDepositVault(
  client: IFireblocksClient,
  vaultName: string,
  opts?: ProvisionDepositVaultOptions,
): Promise<string> {
  const tagIds = opts?.tagIds ?? [];
  const vault = await client.vault.createAccount(vaultName, {
    hiddenOnUI: opts?.hiddenOnUI ?? false,
    customerRefId: opts?.customerRefId,
    autoFuel: opts?.autoFuel ?? true,
  });
  await attachVaultTagsIfNeeded(client, vault, tagIds);
  return vault.id;
}
