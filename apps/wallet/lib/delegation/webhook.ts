/**
 * `wallet.delegation.*` webhook processing.
 *
 * Created: decrypt the RSA envelope with our registered private key, re-seal
 * under AES-256-GCM, store in Redis. Revoked: delete the record - after
 * Dynamic's reshare the stored share is inert, so keeping it is pure liability.
 *
 * Nothing here may log plaintext share or wallet API key material.
 */

import {
  decryptDelegatedWebhookData,
  type EncryptedDelegatedPayload,
} from "@dynamic-labs-wallet/node";

import { normalizePrivateKeyPem, sealMaterial } from "./crypto";
import { deleteDelegationsForWallet, putDelegation } from "./store";

export const DELEGATION_CREATED = "wallet.delegation.created";
export const DELEGATION_REVOKED = "wallet.delegation.revoked";

export function isDelegationEvent(eventName: string): boolean {
  return eventName === DELEGATION_CREATED || eventName === DELEGATION_REVOKED;
}

export interface DelegationCreatedEvent {
  eventName: typeof DELEGATION_CREATED;
  userId?: string;
  data: {
    chain: string;
    walletId: string;
    userId: string;
    publicKey: string;
    shareSetId?: string;
    encryptedDelegatedShare: EncryptedDelegatedPayload;
    encryptedWalletApiKey: EncryptedDelegatedPayload;
  };
}

export interface DelegationRevokedEvent {
  eventName: typeof DELEGATION_REVOKED;
  userId?: string;
  data: { walletId: string; chain: string };
}

export type DelegationEvent = DelegationCreatedEvent | DelegationRevokedEvent;

export type DelegationOutcome =
  | { kind: "stored"; walletId: string }
  | { kind: "revoked"; walletId: string; removed: number }
  | { kind: "skipped"; reason: string };

export interface ProcessDelegationDeps {
  rsaPrivateKey: string | undefined;
  encryptionKey: string | undefined;
  logger?: { info: (line: string) => void };
}

export async function processDelegationWebhook(
  event: DelegationEvent,
  deps: ProcessDelegationDeps,
): Promise<DelegationOutcome> {
  const log = deps.logger?.info ?? (() => {});

  if (event.eventName === DELEGATION_REVOKED) {
    const walletId = event.data?.walletId;
    if (!walletId) return { kind: "skipped", reason: "missing-walletId" };
    const removed = await deleteDelegationsForWallet(walletId, event.userId);
    log(`[delegation] revoked walletId=${walletId} recordsRemoved=${removed}`);
    return { kind: "revoked", walletId, removed };
  }

  const { rsaPrivateKey, encryptionKey } = deps;
  // Fail loudly but without material: an unconfigured receiver silently
  // dropping delegations is worse than a visible skip.
  if (!rsaPrivateKey) {
    return { kind: "skipped", reason: "missing-DELEGATION_RSA_PRIVATE_KEY" };
  }
  if (!encryptionKey) {
    return { kind: "skipped", reason: "missing-DELEGATION_ENC_KEY" };
  }

  const data = event.data;
  const userId = data?.userId ?? event.userId;
  if (!userId || !data?.walletId) {
    return { kind: "skipped", reason: "missing-userId-or-walletId" };
  }

  const { decryptedDelegatedShare, decryptedWalletApiKey } =
    decryptDelegatedWebhookData({
      privateKeyPem: normalizePrivateKeyPem(rsaPrivateKey),
      encryptedDelegatedKeyShare: data.encryptedDelegatedShare,
      encryptedWalletApiKey: data.encryptedWalletApiKey,
    });

  // Uncomment to capture the delegated materials for use in another app. Fires
  // once, at grant time, on the plaintext before it is sealed - so it needs no
  // encryption key and no second decrypt. Treat the output as a private key.
  // console.warn(
  //   "[delegation] DEBUG material dump - treat as a private key:\n" +
  //     JSON.stringify(
  //       {
  //         address: data.publicKey,
  //         walletId: data.walletId,
  //         userId,
  //         walletApiKey: decryptedWalletApiKey,
  //         delegatedShare: decryptedDelegatedShare,
  //         shareSetId: data.shareSetId ?? null,
  //       },
  //       null,
  //       2,
  //     ),
  // );

  await putDelegation(userId, {
    walletId: data.walletId,
    walletAddress: data.publicKey,
    chain: data.chain ?? "EVM",
    encShare: sealMaterial(JSON.stringify(decryptedDelegatedShare), encryptionKey),
    encApiKey: sealMaterial(decryptedWalletApiKey, encryptionKey),
    // Both sub-payloads carry `kid` and are always encrypted to the same key.
    kid: data.encryptedWalletApiKey?.kid ?? data.encryptedDelegatedShare?.kid ?? null,
    shareSetId: data.shareSetId ?? null,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
  });

  log(`[delegation] stored walletId=${data.walletId} chain=${data.chain}`);
  return { kind: "stored", walletId: data.walletId };
}
