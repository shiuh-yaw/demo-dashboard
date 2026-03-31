import {
  fireblocksTransactionWebhookDataSchema,
  type FireblocksTransactionWebhookData,
  type FireblocksWebhookNotification,
} from "@dynamic-demos/fireblocks";
import type { DepositFireblocksNetworkKey } from "@dynamic-demos/dynamic";
import {
  depositFireblocksNetworkFromAssetId,
  dynamicUserIdFromVaultName,
} from "@/lib/assets";
import { getDepositFireblocksEntry } from "@dynamic-demos/dynamic";
import {
  isTxCompleted,
  normalizeAddressCompare,
  submitDepositForward,
} from "@/lib/deposit-forward";
import {
  type DynamicUser,
  dynamicUserOwnsSenderAddress,
  embeddedEvmAddressFromDynamicUser,
  getDynamicUserById,
} from "@/lib/dynamic/user-by-sender-wallet";
import { getFireblocksClient } from "@/lib/fireblocks";
import { webhookAck } from "../respond";
import type { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Screening logger (Chainalysis / Travel Rule)
// ---------------------------------------------------------------------------

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : undefined;
}

const SCREENING_LOG_KEYS = [
  "provider",
  "screeningStatus",
  "status",
  "verdict",
  "bypassReason",
] as const;

function screeningSummary(r: Record<string, unknown>) {
  return Object.fromEntries(
    SCREENING_LOG_KEYS.filter((k) => r[k] !== undefined).map((k) => [k, r[k]]),
  );
}

/**
 * Log Chainalysis / Travel Rule fields when Fireblocks includes them.
 * Uses parsed webhook `data` (schema is `.passthrough()`, so extras survive).
 */
function logScreeningFromWebhookData(tx: FireblocksTransactionWebhookData) {
  const d = tx as unknown as Record<string, unknown>;

  const amlTop = asRecord(d.amlScreeningResult);
  const cr = asRecord(d.complianceResults);

  const amlNested = cr ? asRecord(cr.aml) : undefined;
  const trNested = cr ? asRecord(cr.tr) : undefined;

  const payload = {
    amlScreeningResult: amlTop ? screeningSummary(amlTop) : undefined,
    complianceResults: cr
      ? {
          overallStatus: cr.status,
          aml: amlNested ? screeningSummary(amlNested) : undefined,
          tr: trNested ? screeningSummary(trNested) : undefined,
        }
      : undefined,
  };

  if (payload.amlScreeningResult || payload.complianceResults) {
    console.log("[webhook/fireblocks] Screening", payload);
  } else {
    console.log(
      "[webhook/fireblocks] Screening: no amlScreeningResult or complianceResults on payload",
    );
  }
}

// ---------------------------------------------------------------------------
// Pure validation (no I/O) — all early-exit guard logic in one place
// ---------------------------------------------------------------------------

interface ValidatedIncomingDeposit {
  vaultAccountId: string;
  dynamicUserId: string;
  network: DepositFireblocksNetworkKey;
  sourceAddress: string;
}

type DepositValidationResult =
  | { ok: true; data: ValidatedIncomingDeposit }
  | { ok: false; reason: string };

function validateIncomingDeposit(
  tx: FireblocksTransactionWebhookData,
): DepositValidationResult {
  if (tx.operation && tx.operation !== "TRANSFER") {
    return { ok: false, reason: "skip forward — not a transfer operation" };
  }
  if (tx.destination.type !== "VAULT_ACCOUNT" || !tx.destination.id) {
    return { ok: false, reason: "skip forward — not a vault account" };
  }
  if (!isTxCompleted(tx.status)) {
    return { ok: false, reason: "skip forward — transaction not completed" };
  }
  if (!tx.sourceAddress) {
    return { ok: false, reason: "skip forward — no source address" };
  }

  const dynamicUserId = dynamicUserIdFromVaultName(tx.destination.name ?? "");
  if (!dynamicUserId) {
    return {
      ok: false,
      reason:
        "skip forward — destination vault is not a deposit vault or missing user id",
    };
  }

  const network = depositFireblocksNetworkFromAssetId(tx.assetId);
  if (!network) {
    return {
      ok: false,
      reason: "skip forward — not a configured deposit asset",
    };
  }

  return {
    ok: true,
    data: {
      vaultAccountId: tx.destination.id,
      dynamicUserId,
      network,
      sourceAddress: tx.sourceAddress,
    },
  };
}

// ---------------------------------------------------------------------------
// Remote resolution & cross-entity authorization
// ---------------------------------------------------------------------------

async function resolveAndForwardDeposit(
  tx: FireblocksTransactionWebhookData,
  validated: ValidatedIncomingDeposit,
): Promise<NextResponse> {
  const { vaultAccountId, dynamicUserId, network, sourceAddress } = validated;

  // --- Dynamic user lookup ---
  let dynamicUser: DynamicUser | null;
  try {
    dynamicUser = await getDynamicUserById(dynamicUserId);
  } catch (err) {
    console.error(
      "[webhook/fireblocks] Dynamic get user failed — skip forward",
      { incomingTxId: tx.id, dynamicUserId, err },
    );
    return webhookAck("skip forward — dynamic get user failed");
  }
  if (!dynamicUser) {
    return webhookAck("skip forward — vault owner not found in Dynamic");
  }

  // --- Metadata: internal wallet + vault id ---
  const fireblocks =
    dynamicUser.metadata != null
      ? getDepositFireblocksEntry({ metadata: dynamicUser.metadata }, network)
      : undefined;
  const internalWalletId = fireblocks?.internalWalletId?.trim() ?? "";
  const metadataVaultId = fireblocks?.vaultAccountId?.trim() ?? "";
  if (!internalWalletId) {
    return webhookAck(
      "skip forward — no internal wallet id in user deposit_fireblocks metadata",
    );
  }
  if (!metadataVaultId || metadataVaultId !== vaultAccountId) {
    return webhookAck(
      "skip forward — vault id missing or does not match user metadata",
    );
  }

  // --- Source address ownership ---
  if (!dynamicUserOwnsSenderAddress(dynamicUser, sourceAddress)) {
    return webhookAck(
      "skip forward — source address is not a wallet on the vault owner",
    );
  }

  // --- Fireblocks whitelist check ---
  const client = getFireblocksClient();

  let whitelistedAddress: string;
  try {
    const { assets } = await client.getInternalWallet(internalWalletId);
    const assetRow = assets.find((a) => a.id === tx.assetId);
    whitelistedAddress = assetRow?.address?.trim() ?? "";
  } catch (err) {
    console.error(
      "[webhook/fireblocks] Fireblocks getInternalWallet failed — skip forward",
      { incomingTxId: tx.id, internalWalletId, err },
    );
    return webhookAck("skip forward — fireblocks getInternalWallet failed");
  }
  if (!whitelistedAddress) {
    return webhookAck(
      "skip forward — internal wallet not whitelisted for asset",
    );
  }

  // --- Embedded wallet ↔ whitelist match ---
  const embeddedFromDynamic = embeddedEvmAddressFromDynamicUser(dynamicUser);
  if (!embeddedFromDynamic) {
    return webhookAck("skip forward — no embedded wallet address");
  }
  if (
    normalizeAddressCompare(embeddedFromDynamic) !==
    normalizeAddressCompare(whitelistedAddress)
  ) {
    return webhookAck(
      "skip forward — embedded wallet address does not match Fireblocks whitelist",
    );
  }

  // --- Submit forward ---
  try {
    await submitDepositForward(client, {
      vaultAccountId,
      internalWalletId,
      incomingTxId: tx.id,
      assetId: tx.assetId,
      amount: tx.amount,
      useGasless: true,
    });
  } catch (err) {
    const fbResp = (
      err as { response?: { statusCode?: unknown; data?: unknown } }
    )?.response;
    console.error("[webhook/fireblocks] submitDepositForward failed", {
      incomingTxId: tx.id,
      vaultAccountId,
      internalWalletId,
      message: (err as { message?: string })?.message ?? String(err),
      statusCode: fbResp?.statusCode,
      responseData: fbResp?.data,
    });
    return webhookAck("skip forward — submitDepositForward failed");
  }

  console.log("[webhook/fireblocks] submitDepositForward done", {
    incomingTxId: tx.id,
  });
  return webhookAck("submitDepositForward done");
}

// ---------------------------------------------------------------------------
// Exported handler
// ---------------------------------------------------------------------------

export async function handleTransactionStatusUpdated(
  notification: FireblocksWebhookNotification,
): Promise<NextResponse> {
  const dataParse = fireblocksTransactionWebhookDataSchema.safeParse(
    notification.data,
  );
  if (!dataParse.success) return webhookAck("skip forward — invalid data");

  const tx = dataParse.data;
  logScreeningFromWebhookData(tx);

  console.log("[webhook/fireblocks] transaction.status.updated payload", {
    txId: tx.id,
    status: tx.status,
    operation: tx.operation,
    amount: tx.amount,
    assetId: tx.assetId,
    destinationType: tx.destination.type,
    destinationId: tx.destination.id,
  });

  const validation = validateIncomingDeposit(tx);
  if (!validation.ok) return webhookAck(validation.reason);

  return resolveAndForwardDeposit(tx, validation.data);
}
