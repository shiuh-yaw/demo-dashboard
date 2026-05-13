/**
 * Admin Fund/Release/Sweep/Transfer Handlers
 */

import { getFireblocksClient } from "@/lib/fireblocks";
import {
  createTransactionRequestSchema,
  type CreateTransactionRequest,
} from "@dynamic-demos/fireblocks";
import { ValidationError } from "@/lib/errors";
import {
  requireString,
  requireOmnibusVaultId,
  requireAssetId,
} from "./helpers";

export async function handleFundTransfer(body: unknown) {
  const parsed = createTransactionRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError("Validation failed");
  }

  const client = getFireblocksClient();
  const tx = await client.transactions.create(parsed.data);
  return tx;
}

export async function handleReleaseTransfer(body: unknown) {
  const parsed = createTransactionRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError("Validation failed");
  }

  const data = parsed.data as CreateTransactionRequest;
  if (data.destination.type !== "ONE_TIME_ADDRESS") {
    throw new ValidationError("Release requires ONE_TIME_ADDRESS destination");
  }

  const client = getFireblocksClient();
  const tx = await client.transactions.create(data);
  return tx;
}

/**
 * Sweep: Move funds from a user's vault back to omnibus (VAULT_ACCOUNT → VAULT_ACCOUNT)
 */
export async function handleSweepTransfer(body: Record<string, unknown>) {
  const vaultId = requireString(body, "vaultId");
  const amount = requireString(body, "amount");
  const omnibusVaultId = requireOmnibusVaultId();
  const assetId = requireAssetId();

  const client = getFireblocksClient();
  const tx = await client.transactions.create({
    assetId,
    source: { type: "VAULT_ACCOUNT", id: vaultId },
    destination: { type: "VAULT_ACCOUNT", id: omnibusVaultId },
    amount,
    note: `Sweep from vault ${vaultId} to omnibus`,
  });

  return tx;
}

/**
 * Transfer to wallet: Send from omnibus vault to a user's embedded wallet (ONE_TIME_ADDRESS)
 */
export async function handleTransferToWallet(body: Record<string, unknown>) {
  const walletAddress = requireString(body, "walletAddress");
  const amount = requireString(body, "amount");
  const omnibusVaultId = requireOmnibusVaultId();
  const assetId = requireAssetId();

  const client = getFireblocksClient();
  const tx = await client.transactions.create({
    assetId,
    source: { type: "VAULT_ACCOUNT", id: omnibusVaultId },
    destination: { type: "ONE_TIME_ADDRESS", address: walletAddress },
    amount,
    note: `Transfer to wallet ${walletAddress}`,
  });

  return tx;
}
