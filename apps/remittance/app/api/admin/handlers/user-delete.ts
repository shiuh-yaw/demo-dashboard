/**
 * Admin Delete User Handler
 *
 * Deletes a user from Dynamic and hides their Fireblocks vault.
 */

import {
  deleteUser,
  getUser,
  FIREBLOCKS_VAULT_ID_METADATA_KEY,
} from "@/lib/dynamic-api";
import { getMetadataString } from "@/lib/user-metadata";
import { getFireblocksClient } from "@/lib/fireblocks";

export async function handleDeleteUser(userId: string) {
  const user = await getUser(userId);
  const vaultId = user
    ? getMetadataString(user, FIREBLOCKS_VAULT_ID_METADATA_KEY)
    : null;

  if (vaultId) {
    try {
      const client = getFireblocksClient();
      await client.vault.hideAccount(vaultId);
    } catch (err) {
      console.warn("[admin/users/delete] Failed to hide vault:", err);
    }
  }

  await deleteUser(userId);

  return { deleted: true, vaultHidden: !!vaultId };
}
