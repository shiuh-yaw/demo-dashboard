import {
  getAuthenticatedUser,
  getUserIdFromPayload,
  updateUserMetadata,
  METADATA_KEYS,
} from "@dynamic-demos/dynamic";
import {
  createResponse,
  createErrorResponse,
  withApiHandler,
} from "@/lib/api-response";
import { getFireblocksClient } from "@/lib/fireblocks";
import { getOrCreateDepositAddress } from "@dynamic-demos/fireblocks";
import { TRADE_VAULT_PREFIX } from "@/lib/fireblocks-vault";
import { env } from "@/lib/env";

/**
 * POST /api/wallet/fireblocks/create
 * Create a Fireblocks vault and wallet for the user, store in metadata, set wallet_type.
 * Requires Bearer token or dynamic_jwt cookie.
 */
export const POST = withApiHandler(
  "wallet/fireblocks/create",
  async (request) => {
    const user = await getAuthenticatedUser(request);
    if (!user) return createErrorResponse("Unauthorized", 401);

    const userId = getUserIdFromPayload(user);
    if (!userId) {
      return createErrorResponse("Invalid token: missing user id", 401);
    }

    const assetId =
      env.FIREBLOCKS_DEFAULT_ASSET_ID ?? "BASE_USDC";

    const client = getFireblocksClient();
    const deposit = await getOrCreateDepositAddress(
      client,
      TRADE_VAULT_PREFIX + userId,
      assetId,
    );

    await updateUserMetadata(userId, {
      [METADATA_KEYS.FIREBLOCKS]: {
        vaultId: deposit.vaultId,
        vaultAddress: deposit.address,
      },
      [METADATA_KEYS.WALLET_TYPE]: "fireblocks",
    });

    return createResponse({
      success: true,
      vaultId: deposit.vaultId,
      address: deposit.address,
    });
  },
);
