import { createResponse, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/api/auth";
import { parseJsonBody } from "@/lib/validation";
import { provisionVaultBodySchema } from "@/lib/validation/provision-vault";
import { getOrCreateDepositAddressForVault } from "@dynamic-demos/fireblocks";
import {
  getUser,
  getDepositFireblocksEntry,
  mergeDepositFireblocksNetwork,
} from "@dynamic-demos/dynamic";
import { getFireblocksClient } from "@/lib/fireblocks";
import {
  DEPOSIT_FIREBLOCKS_VAULT_TAG_ID,
  getDepositAssetIds,
  getVaultName,
} from "@/lib/assets";
import { provisionEmbeddedWallet } from "@/lib/provision-embedded-wallet";
import { provisionDepositVault } from "@/lib/provision-deposit-vault";

/**
 * POST /api/vault/provision
 * Requires Bearer token or dynamic_jwt cookie.
 */
export const POST = withApiHandler("vault/provision", async (request) => {
  const userId = await requireUserId(request);
  const { embeddedWalletAddress, network } = await parseJsonBody(
    request,
    provisionVaultBodySchema,
  );

  const dynamicUser = await getUser(userId);
  if (!dynamicUser) throw new Error("User not found");

  const client = getFireblocksClient();
  const assetIds = getDepositAssetIds(network);
  const fireblocks = getDepositFireblocksEntry(dynamicUser, network);
  const addresses = fireblocks?.depositAddresses ?? {};

  let vaultId = fireblocks?.vaultAccountId ?? "";

  if (!vaultId) {
    const vaultName = getVaultName(userId);
    vaultId = await provisionDepositVault(client, vaultName, {
      tagIds: [DEPOSIT_FIREBLOCKS_VAULT_TAG_ID],
      customerRefId: userId,
      hiddenOnUI: false,
      autoFuel: true,
    });
    await mergeDepositFireblocksNetwork(userId, network, {
      vaultAccountId: vaultId,
    });
  }

  if (!fireblocks?.internalWalletId) {
    const internalWalletId = await provisionEmbeddedWallet(client, {
      vaultId,
      name: `Deposit EW ${userId}`,
      embeddedAddress: embeddedWalletAddress,
      assetIds,
    });
    await mergeDepositFireblocksNetwork(userId, network, {
      internalWalletId,
    });
  }

  if (
    !fireblocks?.depositAddresses ||
    Object.keys(fireblocks.depositAddresses).length === 0
  ) {
    for (const assetId of assetIds) {
      const result = await getOrCreateDepositAddressForVault(
        client,
        vaultId,
        assetId,
      );
      addresses[assetId] = result.address;
    }

    await mergeDepositFireblocksNetwork(userId, network, {
      depositAddresses: addresses,
    });
  }

  return createResponse({ vaultId, addresses });
});
