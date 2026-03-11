/**
 * Admin User Vault Handlers
 */

import {
  updateUserMetadata,
  removeUserMetadataKey,
  FIREBLOCKS_VAULT_METADATA_KEY,
  FIREBLOCKS_VAULT_ID_METADATA_KEY,
} from "@/lib/dynamic-api";
import { getFireblocksClient } from "@/lib/fireblocks";
import { getOrCreateDepositAddress } from "@dynamic-demos/fireblocks";
import { OFFRAMP_VAULT_PREFIX } from "@/lib/fireblocks-vault";
import { requireString, requireAssetId } from "./helpers";

export async function handleCreateUserVault(body: Record<string, unknown>) {
  const userId = requireString(body, "userId");
  const assetId = requireAssetId();

  const client = getFireblocksClient();
  const deposit = await getOrCreateDepositAddress(
    client,
    OFFRAMP_VAULT_PREFIX + userId,
    assetId,
  );

  if (deposit.address) {
    try {
      await updateUserMetadata(userId, {
        [FIREBLOCKS_VAULT_METADATA_KEY]: deposit.address,
        [FIREBLOCKS_VAULT_ID_METADATA_KEY]: deposit.vaultId,
      });
    } catch (metaError) {
      console.warn(
        "[admin/users/vault] Failed to store vault in metadata:",
        metaError,
      );
    }
  }

  return { address: deposit.address, vaultId: deposit.vaultId };
}

export async function handleDeleteUserVault(body: Record<string, unknown>) {
  const userId = requireString(body, "userId");
  const vaultId = requireString(body, "vaultId");

  try {
    const client = getFireblocksClient();
    await client.hideVaultAccount(vaultId);
  } catch (err) {
    console.warn("[admin/users/vault] Failed to hide vault:", err);
  }

  await removeUserMetadataKey(userId, FIREBLOCKS_VAULT_METADATA_KEY);
  await removeUserMetadataKey(userId, FIREBLOCKS_VAULT_ID_METADATA_KEY);

  return { deleted: true };
}
