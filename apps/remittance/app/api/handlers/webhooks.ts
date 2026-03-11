/**
 * Webhook Handlers
 *
 * Receives Dynamic events (wallet.created, etc.).
 * Creates Fireblocks vaults for new wallets so users have deposit addresses ready.
 */

import {
  updateUserMetadata,
  FIREBLOCKS_VAULT_METADATA_KEY,
} from "@/lib/dynamic-api";
import { getFireblocksClient } from "@/lib/fireblocks";
import { getOrCreateDepositAddress } from "@dynamic-demos/fireblocks";
import { OFFRAMP_VAULT_PREFIX } from "@/lib/fireblocks-vault";
import { env } from "@/lib/env";

export async function handleDynamicWebhook(body: Record<string, unknown>) {
  const eventType = body.eventName ?? body.event;

  console.log(`[dynamic-webhook] Received event: ${eventType}`);

  if (eventType === "wallet.created") {
    const data = body.data as Record<string, unknown> | undefined;
    const user = data?.user as Record<string, unknown> | undefined;
    const userId = data?.userId ?? user?.id ?? body.userId;
    const assetId = env.FIREBLOCKS_DEFAULT_ASSET_ID;

    if (userId && assetId) {
      try {
        const client = getFireblocksClient();
        const deposit = await getOrCreateDepositAddress(
          client,
          OFFRAMP_VAULT_PREFIX + String(userId),
          assetId,
        );
        console.log(
          `[dynamic-webhook] Created Fireblocks vault for user ${userId}`,
        );
        if (deposit.address && userId) {
          await updateUserMetadata(String(userId), {
            [FIREBLOCKS_VAULT_METADATA_KEY]: deposit.address,
          });
        }
      } catch (fbError) {
        console.warn(
          "[dynamic-webhook] Fireblocks vault creation failed:",
          fbError,
        );
      }
    }
  }

  return { received: true };
}
