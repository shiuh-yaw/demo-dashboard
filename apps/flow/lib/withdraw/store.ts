/**
 * In-memory WithdrawIntent store.
 *
 * Apps/flow is a standalone demo — no shared database. This store
 * keeps the intent lifecycle (sign → vault transfer → flow submit)
 * in a process-local Map with a periodic expiry sweep. Lost on
 * server restart; acceptable for the demo's short-lived flows.
 *
 * If you need durability across restarts, swap this for a small
 * @vercel/kv adapter — the surface (get/create/update/list) is the
 * same.
 */

import { randomBytes } from "node:crypto";

export type WithdrawIntentStatus =
  | "pending"
  | "transfer_submitted"
  | "transfer_confirmed"
  | "flow_submitted"
  | "flow_confirmed"
  | "failed"
  | "expired";

export interface WithdrawIntentRecord {
  id: string;
  configId: string;
  userId: string;
  embeddedWalletAddress: string;
  destinationChain: string;
  destinationAsset: string;
  destinationAddress: string;
  amount: string;
  signature: string;
  typedData: unknown;
  status: WithdrawIntentStatus;
  fbTransferTxHash: string | null;
  flowTransactionId: string | null;
  failureReason: string | null;
  createdAt: string;
  expiresAt: string;
  updatedAt: string;
}

export interface CreateWithdrawIntentInput {
  configId: string;
  userId: string;
  embeddedWalletAddress: string;
  destinationChain: string;
  destinationAsset: string;
  destinationAddress: string;
  amount: string;
  signature: string;
  typedData: unknown;
  ttlSeconds?: number;
}

const TTL_DEFAULT = 60 * 15; // 15 minutes
const STORE: Map<string, WithdrawIntentRecord> = new Map();

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  return `wd_${randomBytes(8).toString("hex")}`;
}

export function createWithdrawIntent(
  input: CreateWithdrawIntentInput,
): WithdrawIntentRecord {
  const ts = nowIso();
  const ttl = input.ttlSeconds ?? TTL_DEFAULT;
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
  const record: WithdrawIntentRecord = {
    id: newId(),
    configId: input.configId,
    userId: input.userId,
    embeddedWalletAddress: input.embeddedWalletAddress,
    destinationChain: input.destinationChain,
    destinationAsset: input.destinationAsset,
    destinationAddress: input.destinationAddress,
    amount: input.amount,
    signature: input.signature,
    typedData: input.typedData,
    status: "pending",
    fbTransferTxHash: null,
    flowTransactionId: null,
    failureReason: null,
    createdAt: ts,
    expiresAt,
    updatedAt: ts,
  };
  STORE.set(record.id, record);
  return record;
}

/**
 * Read + expire-on-read. A pending intent past its TTL flips to
 * `expired` here so consumers never act on stale signatures.
 */
export function getWithdrawIntent(id: string): WithdrawIntentRecord | null {
  const record = STORE.get(id);
  if (!record) return null;
  const isPending =
    record.status !== "expired" &&
    record.status !== "failed" &&
    record.status !== "flow_confirmed";
  if (isPending && new Date(record.expiresAt) < new Date()) {
    const expired = { ...record, status: "expired" as const, updatedAt: nowIso() };
    STORE.set(id, expired);
    return expired;
  }
  return record;
}

export function markTransferConfirmed(
  id: string,
  fbTransferTxHash: string,
): WithdrawIntentRecord | { error: string } {
  const record = STORE.get(id);
  if (!record) return { error: "intent not found" };
  if (
    record.status === "expired" ||
    record.status === "failed" ||
    record.status === "flow_confirmed"
  ) {
    return { error: `intent is ${record.status}` };
  }
  if (
    record.status === "transfer_confirmed" ||
    record.status === "flow_submitted"
  ) {
    return record;
  }
  const next: WithdrawIntentRecord = {
    ...record,
    status: "transfer_confirmed",
    fbTransferTxHash,
    updatedAt: nowIso(),
  };
  STORE.set(id, next);
  return next;
}

export function markFlowSubmitted(
  id: string,
  flowTransactionId: string,
): WithdrawIntentRecord | { error: string } {
  const record = STORE.get(id);
  if (!record) return { error: "intent not found" };
  if (record.status !== "transfer_confirmed") {
    return { error: `intent must be transfer_confirmed (was ${record.status})` };
  }
  const next: WithdrawIntentRecord = {
    ...record,
    status: "flow_submitted",
    flowTransactionId,
    updatedAt: nowIso(),
  };
  STORE.set(id, next);
  return next;
}
