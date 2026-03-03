/**
 * Admin User Vault Handlers
 */

import {
  updateUserMetadata,
  FIREBLOCKS_VAULT_METADATA_KEY,
} from "@/lib/dynamic-api";
import { getFireblocksClient } from "@/lib/fireblocks";
import { getDepositAddressForUser } from "@dynamic-demos/fireblocks";
import { OFFRAMP_VAULT_PREFIX } from "@/lib/fireblocks-vault";
import { requireString, requireAssetId } from "./helpers";

export async function handleCreateUserVault(body: Record<string, unknown>) {
  const userId = requireString(body, "userId");
  const assetId = requireAssetId();

  const client = getFireblocksClient();
  const deposit = await getDepositAddressForUser(
    client,
    userId,
    assetId,
    OFFRAMP_VAULT_PREFIX,
  );

  if (deposit.address) {
    try {
      await updateUserMetadata(userId, {
        [FIREBLOCKS_VAULT_METADATA_KEY]: deposit.address,
      });
    } catch (metaError) {
      console.warn(
        "[admin/users/vault] Failed to store vault in metadata:",
        metaError,
      );
    }
  }

  return { address: deposit.address };
}
