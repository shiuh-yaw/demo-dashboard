/**
 * Admin Vaults Handlers
 */

import { getFireblocksClient } from "@/lib/fireblocks";
import {
  requireOmnibusVaultId,
  requireAssetId,
  optionalString,
} from "./helpers";
import { env } from "@/lib/env";

export async function handleGetOmnibusVault() {
  const omnibusVaultId = requireOmnibusVaultId();
  const client = getFireblocksClient();
  const vault = await client.getVaultAccount(omnibusVaultId);
  return { vault };
}

export async function handleGetVault(vaultId: string) {
  const client = getFireblocksClient();
  const vault = await client.getVaultAccount(vaultId);
  return vault;
}

export async function handleGetVaultAddresses(
  vaultId: string,
  assetId?: string,
) {
  const resolvedAssetId = assetId ?? env.FIREBLOCKS_DEFAULT_ASSET_ID;
  if (!resolvedAssetId) {
    throw new Error(
      "Default asset not configured. Set FIREBLOCKS_DEFAULT_ASSET_ID in .env",
    );
  }

  const client = getFireblocksClient();
  const addresses = await client.getDepositAddresses(vaultId, resolvedAssetId);
  return { addresses };
}

export async function handleCreateVaultAddress(
  vaultId: string,
  body: Record<string, unknown>,
) {
  const description = optionalString(body, "description");
  const assetId = optionalString(body, "assetId") ?? requireAssetId();

  const client = getFireblocksClient();
  const address = await client.createDepositAddress(vaultId, assetId, {
    description,
  });
  return address;
}
