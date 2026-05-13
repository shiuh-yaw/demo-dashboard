/**
 * Vault → internal wallet forward (Fireblocks `createTransaction`).
 *
 * Eligibility checks (vault, Dynamic, Fireblocks whitelist) live in the
 * Fireblocks webhook handler; this module only builds the forward tx and submits it.
 */

import type {
  IFireblocksClient,
  TransactionResponse,
} from "@dynamic-demos/fireblocks";

function forwardExternalTxId(incomingTxId: string): string {
  return `fwd-${incomingTxId}`;
}

export function isTxCompleted(status: string): boolean {
  return String(status).toUpperCase() === "COMPLETED";
}

export function findOutgoingForward(
  outgoingTxs: TransactionResponse[],
  incomingTxId: string,
): TransactionResponse | undefined {
  const extId = forwardExternalTxId(incomingTxId);
  return outgoingTxs.find((t) => t.externalTxId === extId);
}

const IN_PROGRESS_OUTGOING = new Set<string>([
  "SUBMITTED",
  "QUEUED",
  "PENDING_AUTHORIZATION",
  "PENDING_SIGNATURE",
  "BROADCASTING",
  "CONFIRMING",
]);

export function isOutgoingInProgress(status: string): boolean {
  return IN_PROGRESS_OUTGOING.has(String(status).toUpperCase());
}

/** Fireblocks returns 1428 when e.g. internal wallet id is wrong or asset not on wallet. */
function isInvalidDestinationsError(err: unknown): boolean {
  if (err === null || typeof err !== "object") return false;
  const e = err as Record<string, unknown>;
  const msg = typeof e.message === "string" ? e.message : "";
  const resp = e.response as { data?: { code?: number | string } } | undefined;
  const code = resp?.data?.code;
  return (
    /destinations are invalid/i.test(msg) || code === 1428 || code === "1428"
  );
}

export function normalizeAddressCompare(addr: string): string {
  const t = addr.trim();
  if (/^0x[0-9a-fA-F]+$/.test(t)) return t.toLowerCase();
  return t;
}

interface SubmitDepositForwardParams {
  vaultAccountId: string;
  internalWalletId: string;
  incomingTxId: string;
  assetId: string;
  amount: string;
  useGasless?: boolean;
}

/**
 * Submit vault → internal wallet transfer (no validation — caller must gate).
 * Idempotent: uses Fireblocks `externalTxId` for server-side dedup, and
 * pre-checks via `getTransactionByExternalTxId` to avoid unnecessary API calls.
 *
 * @see https://developers.fireblocks.com/reference/createtransaction
 */
export async function submitDepositForward(
  client: IFireblocksClient,
  params: SubmitDepositForwardParams,
): Promise<void> {
  const {
    vaultAccountId,
    internalWalletId,
    incomingTxId,
    assetId,
    amount,
    useGasless = true,
  } = params;
  const incomingTxIdTrim = incomingTxId.trim();
  const internalWalletIdTrim = internalWalletId.trim();
  const extId = forwardExternalTxId(incomingTxIdTrim);

  const existing = await client.transactions.getByExternalId(extId);
  if (existing) {
    console.log(
      "[deposit-forward] skip createTransaction — forward already exists for incoming tx",
      { incomingTxId: incomingTxIdTrim, externalTxId: extId },
    );
    return;
  }

  const txRequest = {
    assetId,
    source: { type: "VAULT_ACCOUNT" as const, id: vaultAccountId },
    destination: {
      type: "INTERNAL_WALLET" as const,
      id: internalWalletIdTrim,
    },
    amount,
    externalTxId: extId,
    note: extId,
    useGasless,
  };

  console.log("[deposit-forward] createTransaction (vault → internal wallet)", {
    incomingTxId: incomingTxIdTrim,
    ...txRequest,
  });

  try {
    await client.transactions.create(txRequest);
    console.log("[deposit-forward] forward transaction submitted", {
      incomingTxId: incomingTxIdTrim,
      externalTxId: extId,
      internalWalletId: internalWalletIdTrim,
    });
  } catch (err) {
    if (isInvalidDestinationsError(err)) {
      console.warn(
        "[deposit-forward] Fireblocks rejected destination — internal wallet id may be stale, or asset not whitelisted on that wallet (often: never ran provision for this vault / Dynamic address). Ack webhook; user can re-provision.",
        {
          vaultAccountId,
          internalWalletId: internalWalletIdTrim,
          assetId,
          err,
        },
      );
      return;
    }
    throw err;
  }
}
