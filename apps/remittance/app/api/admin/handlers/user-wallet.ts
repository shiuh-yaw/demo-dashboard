/**
 * Admin User Wallet Handler
 */

import {
  createPregenWallet,
  updateUserMetadata,
  FIREBLOCKS_VAULT_METADATA_KEY,
} from "@/lib/dynamic-api";
import { getFireblocksClient } from "@/lib/fireblocks";
import { getDepositAddressForUser } from "@dynamic-demos/fireblocks";
import { OFFRAMP_VAULT_PREFIX } from "@/lib/fireblocks-vault";
import { env } from "@/lib/env";
import { optionalString } from "./helpers";
import { ValidationError } from "@/lib/errors";

export async function handleCreateUserWallet(body: Record<string, unknown>) {
  const userId = optionalString(body, "userId");
  const email = optionalString(body, "email");

  if (!userId && !email) {
    throw new ValidationError("email or userId is required");
  }

  const wallet = await createPregenWallet({
    type: "EVM",
    ...(userId && { userId }),
    ...(!userId && email && { email }),
  });

  const assetId = env.FIREBLOCKS_DEFAULT_ASSET_ID;
  const dynamicUserId = wallet.userId ?? userId;

  if (dynamicUserId && assetId) {
    try {
      const client = getFireblocksClient();
      const deposit = await getDepositAddressForUser(
        client,
        dynamicUserId,
        assetId,
        OFFRAMP_VAULT_PREFIX,
      );
      if (deposit.address && dynamicUserId) {
        await updateUserMetadata(dynamicUserId, {
          [FIREBLOCKS_VAULT_METADATA_KEY]: deposit.address,
        });
      }
    } catch (fbError) {
      console.warn(
        "[admin/users/wallet] Fireblocks vault creation failed:",
        fbError,
      );
    }
  }

  return { address: wallet.address, id: wallet.id };
}
