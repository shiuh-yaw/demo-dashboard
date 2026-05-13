/**
 * Create a Fireblocks internal wallet, whitelist the embedded (external) address per asset,
 * and link the vault.
 *
 * @see https://developers.fireblocks.com/reference/createinternalwallet
 * @see https://developers.fireblocks.com/reference/createinternalwalletasset
 */

import type { IFireblocksClient } from "@dynamic-demos/fireblocks";

function customerRefFromInternalWalletName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

async function findInternalWalletIdByName(
  client: IFireblocksClient,
  name: string,
): Promise<string | undefined> {
  const wallets = await client.internalWallets.list();
  return wallets.find((w) => w.name === name)?.id;
}

async function ensureEmbeddedAddressWhitelistedOnInternalWallet(
  client: IFireblocksClient,
  internalWalletId: string,
  embeddedAddress: string,
  assetIds: string[],
): Promise<void> {
  const uniqueAssetIds = [
    ...new Set(assetIds.map((id) => id.trim()).filter(Boolean)),
  ];
  const { assets: existingAssets } =
    await client.internalWallets.get(internalWalletId);
  for (const assetId of uniqueAssetIds) {
    if (existingAssets.some((a) => a.id === assetId)) continue;
    await client.internalWallets.createAsset(
      internalWalletId,
      assetId,
      embeddedAddress,
    );
  }
}

export async function provisionEmbeddedWallet(
  client: IFireblocksClient,
  params: {
    vaultId: string;
    /** Display name for the Fireblocks internal wallet (e.g. `Deposit EW {userId}`). */
    name: string;
    /** Dynamic embedded wallet address to whitelist on the internal wallet. */
    embeddedAddress: string;
    /** Fireblocks asset ids (e.g. vault deposit assets) to attach for that address. */
    assetIds: string[];
  },
): Promise<string> {
  const { vaultId, name, embeddedAddress, assetIds } = params;
  const customerRefId = customerRefFromInternalWalletName(name);

  console.log("[deposit/provision-embedded-wallet] create internal wallet", {
    vaultId,
    name,
    customerRefId,
    assetIds,
    embeddedAddress,
  });

  let internalWalletId: string;
  try {
    internalWalletId = (
      await client.internalWallets.create(name, { customerRefId })
    ).id;
  } catch (err) {
    const existingId = await findInternalWalletIdByName(client, name);
    if (!existingId) throw err;
    internalWalletId = existingId;
    console.log("[deposit/provision-embedded-wallet] reuse existing wallet", {
      name,
      internalWalletId,
    });
  }

  await ensureEmbeddedAddressWhitelistedOnInternalWallet(
    client,
    internalWalletId,
    embeddedAddress,
    assetIds,
  );

  // Store the internal wallet id as the vault's `customerRefId` so the
  // webhook handler can later resolve the vault → internal wallet mapping.
  await client.vault.setCustomerRefId(vaultId, internalWalletId);

  console.log("[deposit/provision-embedded-wallet] done", {
    vaultId,
    internalWalletId,
  });

  return internalWalletId;
}
